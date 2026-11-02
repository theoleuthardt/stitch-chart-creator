package dev.theocloud.stitchchart.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request bodies of the auth routes. */
final class AuthRequests {

  private AuthRequests() {}

  record Register(
      @NotBlank @Size(min = 3, max = 32) @Pattern(regexp = "[A-Za-z0-9_.-]+") String username,
      @NotBlank @Size(max = 254) @Pattern(regexp = "[^@\\s]+@[^@\\s]+\\.[^@\\s]+") String email,
      @NotBlank @Size(min = 12, max = 128) String password) {}

  record Login(
      @NotBlank @Size(max = 254) String username, @NotBlank @Size(max = 128) String password) {}
}
