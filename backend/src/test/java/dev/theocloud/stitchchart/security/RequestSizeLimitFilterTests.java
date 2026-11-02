package dev.theocloud.stitchchart.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestSizeLimitFilterTests {

  private final RequestSizeLimitFilter filter = new RequestSizeLimitFilter(100, 50, 1);

  private MockHttpServletResponse run(MockHttpServletRequest request) throws Exception {
    MockHttpServletResponse response = new MockHttpServletResponse();
    filter.doFilter(request, response, new MockFilterChain());
    return response;
  }

  private static MockHttpServletRequest post(byte[] body) {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/patterns");
    request.setContent(body);
    return request;
  }

  @Test
  void largeBodiesWaitTheirTurn() throws Exception {
    MockHttpServletResponse second = new MockHttpServletResponse();
    FilterChain chainThatStartsASecondRequest =
        (request, response) -> filter.doFilter(post(new byte[60]), second, new MockFilterChain());

    filter.doFilter(
        post(new byte[60]), new MockHttpServletResponse(), chainThatStartsASecondRequest);

    assertThat(second.getStatus()).isEqualTo(503);
  }

  @Test
  void aFinishedLargeRequestFreesItsSlot() throws Exception {
    run(post(new byte[60]));

    assertThat(run(post(new byte[60])).getStatus()).isEqualTo(200);
  }

  @Test
  void aFailingLargeRequestFreesItsSlot() throws Exception {
    FilterChain failing =
        (request, response) -> {
          throw new ServletException("failed");
        };
    assertThatThrownBy(
            () -> filter.doFilter(post(new byte[60]), new MockHttpServletResponse(), failing))
        .isInstanceOf(ServletException.class);

    assertThat(run(post(new byte[60])).getStatus()).isEqualTo(200);
  }

  @Test
  void smallBodiesAreNeverHeldBack() throws Exception {
    MockHttpServletResponse small = new MockHttpServletResponse();
    FilterChain chainThatStartsASmallRequest =
        (request, response) -> filter.doFilter(post(new byte[10]), small, new MockFilterChain());

    filter.doFilter(
        post(new byte[60]), new MockHttpServletResponse(), chainThatStartsASmallRequest);

    assertThat(small.getStatus()).isEqualTo(200);
  }

  @Test
  void aBodyWithinTheLimitPasses() throws Exception {
    assertThat(run(post(new byte[100])).getStatus()).isEqualTo(200);
  }

  @Test
  void aBodyOverTheLimitIsRejected() throws Exception {
    assertThat(run(post(new byte[101])).getStatus()).isEqualTo(413);
  }

  @Test
  void aChunkedBodyIsRejected() throws Exception {
    MockHttpServletRequest request = post(null);
    request.addHeader("Transfer-Encoding", "chunked");

    assertThat(run(request).getStatus()).isEqualTo(411);
  }

  @Test
  void aPostWithoutABodyPasses() throws Exception {
    assertThat(run(post(null)).getStatus()).isEqualTo(200);
  }

  @Test
  void readsAreNotAffected() throws Exception {
    assertThat(run(new MockHttpServletRequest("GET", "/api/patterns")).getStatus()).isEqualTo(200);
  }
}
