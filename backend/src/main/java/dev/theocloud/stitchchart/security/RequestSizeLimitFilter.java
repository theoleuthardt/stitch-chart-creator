package dev.theocloud.stitchchart.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.Semaphore;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * The technical limit on the size of a request. Chunked bodies do not announce their length and are
 * refused, so the announced length is enough to enforce it before anything is read.
 *
 * <p>One large chart costs several times its body size in memory, so only a few large bodies are
 * handled at once and the others answer 503. Autosave simply tries again a moment later.
 */
class RequestSizeLimitFilter extends OncePerRequestFilter {

  private final long maxBytes;
  private final long largeBytes;
  private final Semaphore largeRequests;

  RequestSizeLimitFilter(long maxBytes, long largeBytes, int largeRequestSlots) {
    this.maxBytes = maxBytes;
    this.largeBytes = largeBytes;
    this.largeRequests = new Semaphore(largeRequestSlots);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (request.getHeader("Transfer-Encoding") != null) {
      response.setStatus(HttpStatus.LENGTH_REQUIRED.value());
      return;
    }
    long length = request.getContentLengthLong();
    if (length > maxBytes) {
      response.setStatus(HttpStatus.CONTENT_TOO_LARGE.value());
      return;
    }
    if (length <= largeBytes) {
      chain.doFilter(request, response);
      return;
    }
    if (!largeRequests.tryAcquire()) {
      response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
      return;
    }
    try {
      chain.doFilter(request, response);
    } finally {
      largeRequests.release();
    }
  }
}
