package dev.theocloud.stitchchart.account;

import java.util.UUID;

/** The public view of an account. */
record UserResponse(UUID id, String username, String email) {

  static UserResponse of(UserAccount account) {
    return new UserResponse(account.getId(), account.getUsername(), account.getEmail());
  }
}
