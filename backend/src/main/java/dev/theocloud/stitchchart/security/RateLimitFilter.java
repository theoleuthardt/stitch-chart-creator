package dev.theocloud.stitchchart.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Predicate;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Limits the requests on a group of public routes per client address with a fixed window. The
 * counters live in memory: the app runs as a single instance, and losing them on a restart is
 * harmless.
 */
class RateLimitFilter extends OncePerRequestFilter {

  private static final long WINDOW_MILLIS = Duration.ofMinutes(1).toMillis();
  private static final int MAX_TRACKED_ADDRESSES = 100_000;

  private final Predicate<HttpServletRequest> applies;
  private final int maxRequests;
  private final Map<String, Window> windows = new ConcurrentHashMap<>();

  private record Window(long startedAt, int requests) {}

  RateLimitFilter(Predicate<HttpServletRequest> applies, int maxRequests) {
    this.applies = applies;
    this.maxRequests = maxRequests;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return !applies.test(request);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    long now = System.currentTimeMillis();
    if (windows.size() > MAX_TRACKED_ADDRESSES) {
      windows.values().removeIf(window -> now - window.startedAt() >= WINDOW_MILLIS);
    }
    Window window =
        windows.compute(
            request.getRemoteAddr(),
            (address, current) ->
                current == null || now - current.startedAt() >= WINDOW_MILLIS
                    ? new Window(now, 1)
                    : new Window(current.startedAt(), current.requests() + 1));
    if (window.requests() > maxRequests) {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
      return;
    }
    chain.doFilter(request, response);
  }
}
