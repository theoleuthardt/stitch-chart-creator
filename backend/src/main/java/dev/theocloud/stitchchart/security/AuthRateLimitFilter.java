package dev.theocloud.stitchchart.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Limits sign-in and registration per client address with a fixed window. The counters live in
 * memory: the app runs as a single instance, and losing them on a restart is harmless.
 */
class AuthRateLimitFilter extends OncePerRequestFilter {

  private static final int MAX_ATTEMPTS = 30;
  private static final long WINDOW_MILLIS = Duration.ofMinutes(1).toMillis();
  private static final int MAX_TRACKED_ADDRESSES = 100_000;

  private final Map<String, Window> windows = new ConcurrentHashMap<>();

  private record Window(long startedAt, int attempts) {}

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return !"POST".equals(request.getMethod())
        || !(path.equals("/api/auth/login") || path.equals("/api/auth/register"));
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
                    : new Window(current.startedAt(), current.attempts() + 1));
    if (window.attempts() > MAX_ATTEMPTS) {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
      return;
    }
    chain.doFilter(request, response);
  }
}
