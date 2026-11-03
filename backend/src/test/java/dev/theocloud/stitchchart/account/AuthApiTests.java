package dev.theocloud.stitchchart.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.theocloud.stitchchart.IntegrationTest;
import jakarta.servlet.http.Cookie;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@IntegrationTest
class AuthApiTests {

  private static final String PASSWORD = "correct horse battery";

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;

  private final String clientIp =
      "10.%d.%d.%d"
          .formatted(
              ThreadLocalRandom.current().nextInt(255),
              ThreadLocalRandom.current().nextInt(255),
              ThreadLocalRandom.current().nextInt(255));

  private RequestPostProcessor fromClient() {
    return request -> {
      request.setRemoteAddr(clientIp);
      return request;
    };
  }

  private static String unique() {
    return "u" + UUID.randomUUID().toString().substring(0, 12);
  }

  private static String json(String username, String email, String password) {
    return """
    {"username":"%s","email":"%s","password":"%s"}\
    """
        .formatted(username, email, password);
  }

  private ResultActions postJson(String path, String body) throws Exception {
    return mockMvc.perform(
        post(path)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .with(csrf())
            .with(fromClient()));
  }

  private ResultActions register(String username) throws Exception {
    return postJson("/api/auth/register", json(username, username + "@example.com", PASSWORD));
  }

  private ResultActions login(String username, String password) throws Exception {
    return postJson(
        "/api/auth/login",
        "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password));
  }

  private static Cookie session(ResultActions result) {
    return result.andReturn().getResponse().getCookie("SESSION");
  }

  private ResultActions me(Cookie session) throws Exception {
    MockHttpServletRequestBuilder request = get("/api/auth/me");
    return mockMvc.perform(session == null ? request : request.cookie(session));
  }

  @Test
  void registeringCreatesTheAccountAndSignsIn() throws Exception {
    String username = unique();

    ResultActions result =
        register(username)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.username").value(username))
            .andExpect(jsonPath("$.email").value(username + "@example.com"))
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.passwordHash").doesNotExist());

    me(session(result))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value(username));
  }

  @Test
  void passwordsAreStoredAsArgon2Hashes() throws Exception {
    String username = unique();
    register(username).andExpect(status().isCreated());

    String hash =
        jdbcTemplate.queryForObject(
            "select password_hash from users where username = ?", String.class, username);

    assertThat(hash).startsWith("$argon2id$").doesNotContain(PASSWORD);
  }

  @Test
  void usernamesAreUniqueIgnoringCase() throws Exception {
    String username = unique();
    register(username).andExpect(status().isCreated());

    postJson(
            "/api/auth/register", json(username.toUpperCase(), unique() + "@example.com", PASSWORD))
        .andExpect(status().isConflict());
  }

  @Test
  void emailsAreUniqueIgnoringCase() throws Exception {
    String email = unique() + "@example.com";
    postJson("/api/auth/register", json(unique(), email, PASSWORD)).andExpect(status().isCreated());

    postJson("/api/auth/register", json(unique(), email.toUpperCase(), PASSWORD))
        .andExpect(status().isConflict());
  }

  @Test
  void badRegistrationInputIsRejected() throws Exception {
    postJson("/api/auth/register", json("ab", unique() + "@example.com", PASSWORD))
        .andExpect(status().isBadRequest());
    postJson("/api/auth/register", json("bad name!", unique() + "@example.com", PASSWORD))
        .andExpect(status().isBadRequest());
    postJson("/api/auth/register", json(unique(), "not-an-email", PASSWORD))
        .andExpect(status().isBadRequest());
    postJson("/api/auth/register", json(unique(), unique() + "@example.com", "too short"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void signingInWorksWithUsernameOrEmail() throws Exception {
    String username = unique();
    register(username).andExpect(status().isCreated());

    ResultActions byName = login(username, PASSWORD).andExpect(status().isOk());
    me(session(byName)).andExpect(status().isOk());

    login(username + "@example.com", PASSWORD)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value(username));
  }

  @Test
  void loginErrorsDoNotRevealWhetherAnAccountExists() throws Exception {
    String username = unique();
    register(username).andExpect(status().isCreated());

    String wrongPassword =
        login(username, "wrong password here")
            .andExpect(status().isUnauthorized())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String unknownUser =
        login(unique(), PASSWORD)
            .andExpect(status().isUnauthorized())
            .andReturn()
            .getResponse()
            .getContentAsString();

    assertThat(unknownUser).isEqualTo(wrongPassword);
  }

  @Test
  void fiveFailedLoginsLockTheAccountUntilTheLockExpires() throws Exception {
    String username = unique();
    register(username).andExpect(status().isCreated());

    for (int attempt = 0; attempt < 5; attempt++) {
      login(username, "wrong password here").andExpect(status().isUnauthorized());
    }
    login(username, PASSWORD).andExpect(status().isUnauthorized());

    jdbcTemplate.update(
        "update users set locked_until = now() - interval '1 second' where username = ?", username);
    login(username, PASSWORD).andExpect(status().isOk());
  }

  @Test
  void parallelFailedLoginsStillLockTheAccount() throws Exception {
    String username = unique();
    register(username).andExpect(status().isCreated());

    try (ExecutorService pool = Executors.newFixedThreadPool(5)) {
      List<Callable<Integer>> attempts =
          Collections.nCopies(
              5,
              () -> login(username, "wrong password here").andReturn().getResponse().getStatus());
      for (Future<Integer> attempt : pool.invokeAll(attempts)) {
        assertThat(attempt.get()).isEqualTo(401);
      }
    }

    login(username, PASSWORD).andExpect(status().isUnauthorized());
  }

  @Test
  void aSuccessfulLoginResetsTheFailureCount() throws Exception {
    String username = unique();
    register(username).andExpect(status().isCreated());

    for (int attempt = 0; attempt < 4; attempt++) {
      login(username, "wrong password here").andExpect(status().isUnauthorized());
    }
    login(username, PASSWORD).andExpect(status().isOk());
    for (int attempt = 0; attempt < 4; attempt++) {
      login(username, "wrong password here").andExpect(status().isUnauthorized());
    }

    login(username, PASSWORD).andExpect(status().isOk());
  }

  @Test
  void tooManyAttemptsFromOneAddressAreRateLimited() throws Exception {
    int lastStatus = 0;
    for (int attempt = 0; attempt < 31; attempt++) {
      lastStatus = login(unique(), "wrong password here").andReturn().getResponse().getStatus();
    }

    assertThat(lastStatus).isEqualTo(429);
  }

  @Test
  void signingOutEndsTheSession() throws Exception {
    String username = unique();
    Cookie session = session(register(username));

    mockMvc
        .perform(post("/api/auth/logout").cookie(session).with(csrf()))
        .andExpect(status().isNoContent());

    me(session).andExpect(status().isUnauthorized());
  }

  @Test
  void protectedRoutesAnswer401WithoutASession() throws Exception {
    me(null).andExpect(status().isUnauthorized());
  }

  @Test
  void writesWithoutACsrfTokenAreRejected() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"a\",\"password\":\"b\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void healthStaysPublic() throws Exception {
    mockMvc.perform(get("/api/health")).andExpect(status().isOk());
  }
}
