package dev.theocloud.stitchchart.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestSizeLimitFilterTests {

  private final RequestSizeLimitFilter filter = new RequestSizeLimitFilter(100);

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
