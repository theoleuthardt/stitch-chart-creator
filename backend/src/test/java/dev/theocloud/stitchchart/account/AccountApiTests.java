package dev.theocloud.stitchchart.account;

import static dev.theocloud.stitchchart.TestAccounts.PASSWORD;
import static dev.theocloud.stitchchart.TestAccounts.signIn;
import static dev.theocloud.stitchchart.TestAccounts.signUp;
import static dev.theocloud.stitchchart.TestAccounts.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.theocloud.stitchchart.IntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class AccountApiTests {

  private static final String NEW_PASSWORD = "a brand new passphrase";

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;

  private ResultActions changePassword(Cookie session, String current, String next)
      throws Exception {
    return mockMvc.perform(
        put("/api/account/password")
            .cookie(session)
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                "{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"}".formatted(current, next)));
  }

  private ResultActions updateProfile(Cookie session, String username, String email)
      throws Exception {
    return mockMvc.perform(
        put("/api/account")
            .cookie(session)
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"username\":\"%s\",\"email\":\"%s\"}".formatted(username, email)));
  }

  private ResultActions deleteAccount(Cookie session, String password) throws Exception {
    return mockMvc.perform(
        delete("/api/account")
            .cookie(session)
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"password\":\"%s\"}".formatted(password)));
  }

  private ResultActions me(Cookie session) throws Exception {
    return mockMvc.perform(get("/api/auth/me").cookie(session));
  }

  @Test
  void changingThePasswordReplacesItAndEndsAllOtherSessions() throws Exception {
    String name = uniqueName();
    Cookie current = signUp(mockMvc, name);
    Cookie other = signIn(mockMvc, name, PASSWORD);

    changePassword(current, PASSWORD, NEW_PASSWORD).andExpect(status().isNoContent());

    me(current).andExpect(status().isOk());
    me(other).andExpect(status().isUnauthorized());
    assertThat(signIn(mockMvc, name, PASSWORD)).isNull();
    assertThat(signIn(mockMvc, name, NEW_PASSWORD)).isNotNull();
  }

  @Test
  void changingThePasswordLeavesOtherUsersSignedIn() throws Exception {
    Cookie someoneElse = signUp(mockMvc, uniqueName());

    changePassword(signUp(mockMvc, uniqueName()), PASSWORD, NEW_PASSWORD)
        .andExpect(status().isNoContent());

    me(someoneElse).andExpect(status().isOk());
  }

  @Test
  void changingThePasswordNeedsTheCurrentOne() throws Exception {
    String name = uniqueName();
    Cookie session = signUp(mockMvc, name);

    changePassword(session, "not my password", NEW_PASSWORD).andExpect(status().isBadRequest());

    assertThat(signIn(mockMvc, name, PASSWORD)).isNotNull();
  }

  @Test
  void aNewPasswordMustBeLongEnough() throws Exception {
    changePassword(signUp(mockMvc, uniqueName()), PASSWORD, "too short")
        .andExpect(status().isBadRequest());
  }

  @Test
  void usernameAndEmailCanBeChanged() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String name = uniqueName();

    updateProfile(session, name, name + "@example.org")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value(name))
        .andExpect(jsonPath("$.email").value(name + "@example.org"));

    me(session).andExpect(jsonPath("$.username").value(name));
  }

  @Test
  void keepingTheOwnNameInADifferentCaseIsAllowed() throws Exception {
    String name = uniqueName();
    Cookie session = signUp(mockMvc, name);

    updateProfile(session, name.toUpperCase(), name + "@example.com").andExpect(status().isOk());
  }

  @Test
  void aNameOrEmailOfAnotherAccountIsRejected() throws Exception {
    String taken = uniqueName();
    signUp(mockMvc, taken);
    String name = uniqueName();
    Cookie session = signUp(mockMvc, name);

    updateProfile(session, taken, name + "@example.com").andExpect(status().isConflict());
    updateProfile(session, name, taken + "@example.com").andExpect(status().isConflict());
  }

  @Test
  void badProfileInputIsRejected() throws Exception {
    String name = uniqueName();
    Cookie session = signUp(mockMvc, name);

    updateProfile(session, "x", name + "@example.com").andExpect(status().isBadRequest());
    updateProfile(session, name, "nope").andExpect(status().isBadRequest());
  }

  @Test
  void deletingTheAccountRemovesItAndEndsItsSessions() throws Exception {
    String name = uniqueName();
    Cookie session = signUp(mockMvc, name);
    Cookie other = signIn(mockMvc, name, PASSWORD);

    deleteAccount(session, PASSWORD).andExpect(status().isNoContent());

    me(session).andExpect(status().isUnauthorized());
    me(other).andExpect(status().isUnauthorized());
    assertThat(signIn(mockMvc, name, PASSWORD)).isNull();
    assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from users where username = ?", Integer.class, name))
        .isZero();
  }

  @Test
  void deletingTheAccountNeedsThePassword() throws Exception {
    String name = uniqueName();
    Cookie session = signUp(mockMvc, name);

    deleteAccount(session, "not my password").andExpect(status().isBadRequest());

    me(session).andExpect(status().isOk());
  }

  @Test
  void deletingAnAccountLeavesOtherAccountsAlone() throws Exception {
    Cookie someoneElse = signUp(mockMvc, uniqueName());

    deleteAccount(signUp(mockMvc, uniqueName()), PASSWORD).andExpect(status().isNoContent());

    me(someoneElse).andExpect(status().isOk());
  }

  @Test
  void accountRoutesNeedASession() throws Exception {
    mockMvc
        .perform(
            put("/api/account/password")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isUnauthorized());
  }
}
