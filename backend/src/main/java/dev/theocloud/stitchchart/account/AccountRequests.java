package dev.theocloud.stitchchart.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request bodies of the auth and account routes. */
final class AccountRequests {

  private static final String USERNAME = "[A-Za-z0-9_.-]+";
  private static final String EMAIL = "[^@\\s]+@[^@\\s]+\\.[^@\\s]+";

  private AccountRequests() {}

  record Register(
      @NotBlank @Size(min = 3, max = 32) @Pattern(regexp = USERNAME) String username,
      @NotBlank @Size(max = 254) @Pattern(regexp = EMAIL) String email,
      @NotBlank @Size(min = 12, max = 128) String password) {}

  record Login(
      @NotBlank @Size(max = 254) String username, @NotBlank @Size(max = 128) String password) {}

  record UpdateProfile(
      @NotBlank @Size(min = 3, max = 32) @Pattern(regexp = USERNAME) String username,
      @NotBlank @Size(max = 254) @Pattern(regexp = EMAIL) String email) {}

  record ChangePassword(
      @NotBlank @Size(max = 128) String currentPassword,
      @NotBlank @Size(min = 12, max = 128) String newPassword) {}

  record DeleteAccount(@NotBlank @Size(max = 128) String password) {}
}
