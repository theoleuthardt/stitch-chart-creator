package dev.theocloud.stitchchart.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * The technical limit on the size of a request. Chunked bodies do not announce their length and are
 * refused, so the announced length is enough to enforce it before anything is read.
 */
class RequestSizeLimitFilter extends OncePerRequestFilter {

  private final long maxBytes;

  RequestSizeLimitFilter(long maxBytes) {
    this.maxBytes = maxBytes;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (request.getHeader("Transfer-Encoding") != null) {
      response.setStatus(HttpStatus.LENGTH_REQUIRED.value());
      return;
    }
    if (request.getContentLengthLong() > maxBytes) {
      response.setStatus(HttpStatus.CONTENT_TOO_LARGE.value());
      return;
    }
    chain.doFilter(request, response);
  }
}
