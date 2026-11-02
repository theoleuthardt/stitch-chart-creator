package dev.theocloud.stitchchart.account;

import static org.assertj.core.api.Assertions.assertThat;

import dev.theocloud.stitchchart.TestcontainersConfiguration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

/** Walks the browser flow over real HTTP: the CSRF cookie from a GET, then a sign-up with it. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class SessionCookieHttpTests {

  @LocalServerPort private int port;

  private final HttpClient client = HttpClient.newHttpClient();

  private static String cookieHeader(List<String> setCookies, String name) {
    return setCookies.stream().filter(c -> c.startsWith(name + "=")).findFirst().orElseThrow();
  }

  @Test
  void theSpaFlowGetsAnHttpOnlySessionCookie() throws Exception {
    HttpResponse<String> first =
        client.send(
            HttpRequest.newBuilder(URI.create("http://localhost:%d/api/auth/me".formatted(port)))
                .build(),
            HttpResponse.BodyHandlers.ofString());
    assertThat(first.statusCode()).isEqualTo(401);
    String csrfCookie = cookieHeader(first.headers().allValues("set-cookie"), "XSRF-TOKEN");
    String csrfToken = csrfCookie.substring("XSRF-TOKEN=".length(), csrfCookie.indexOf(';'));
    assertThat(csrfCookie).doesNotContainIgnoringCase("HttpOnly");

    String name = "u" + UUID.randomUUID().toString().substring(0, 12);
    HttpResponse<String> registered =
        client.send(
            HttpRequest.newBuilder(
                    URI.create("http://localhost:%d/api/auth/register".formatted(port)))
                .header("Content-Type", "application/json")
                .header("Cookie", "XSRF-TOKEN=" + csrfToken)
                .header("X-XSRF-TOKEN", csrfToken)
                .POST(
                    HttpRequest.BodyPublishers.ofString(
                        "{\"username\":\"%s\",\"email\":\"%s@example.com\",\"password\":\"correct horse battery\"}"
                            .formatted(name, name)))
                .build(),
            HttpResponse.BodyHandlers.ofString());

    assertThat(registered.statusCode()).isEqualTo(201);
    String session = cookieHeader(registered.headers().allValues("set-cookie"), "SESSION");
    assertThat(session).containsIgnoringCase("HttpOnly").containsIgnoringCase("SameSite=Lax");
    assertThat(session).containsIgnoringCase("Secure");
  }
}
