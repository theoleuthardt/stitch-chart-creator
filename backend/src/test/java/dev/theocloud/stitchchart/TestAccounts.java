package dev.theocloud.stitchchart;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import jakarta.servlet.http.Cookie;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Creates and signs in accounts for API tests; every call comes from its own client address. */
public final class TestAccounts {

  public static final String PASSWORD = "correct horse battery";

  private TestAccounts() {}

  /** A username that no other test uses. */
  public static String uniqueName() {
    return "u" + UUID.randomUUID().toString().substring(0, 12);
  }

  /** Registers a new account and returns its session cookie. */
  public static Cookie signUp(MockMvc mockMvc, String username) throws Exception {
    return session(
        mockMvc,
        "/api/auth/register",
        "{\"username\":\"%s\",\"email\":\"%s@example.com\",\"password\":\"%s\"}"
            .formatted(username, username, PASSWORD));
  }

  /** Signs in and returns the session cookie. */
  public static Cookie signIn(MockMvc mockMvc, String username, String password) throws Exception {
    return session(
        mockMvc,
        "/api/auth/login",
        "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password));
  }

  private static Cookie session(MockMvc mockMvc, String path, String body) throws Exception {
    return mockMvc
        .perform(
            post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .with(csrf())
                .with(request -> {
                  request.setRemoteAddr("10.0.0." + ThreadLocalRandom.current().nextInt(1, 255));
                  return request;
                }))
        .andReturn()
        .getResponse()
        .getCookie("SESSION");
  }
}
