package dev.theocloud.stitchchart.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/** A registered user. */
@Entity
@Table(name = "users")
public class UserAccount {

  /** Failed logins in a row that lock an account. */
  static final int MAX_FAILED_LOGINS = 5;

  /** How long a locked account stays locked. */
  static final Duration LOCK_DURATION = Duration.ofMinutes(15);

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private String username;

  @Column(nullable = false)
  private String email;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Column(name = "failed_logins", nullable = false)
  private int failedLogins;

  @Column(name = "locked_until")
  private Instant lockedUntil;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  protected UserAccount() {}

  UserAccount(String username, String email, String passwordHash) {
    this.username = username;
    this.email = email;
    this.passwordHash = passwordHash;
  }

  public UUID getId() {
    return id;
  }

  public String getUsername() {
    return username;
  }

  public String getEmail() {
    return email;
  }

  String getPasswordHash() {
    return passwordHash;
  }

  boolean isLocked(Instant now) {
    return lockedUntil != null && lockedUntil.isAfter(now);
  }

  /** Counts a failed login and locks the account once the limit is reached. */
  void recordFailedLogin(Instant now) {
    failedLogins++;
    if (failedLogins >= MAX_FAILED_LOGINS) {
      lockedUntil = now.plus(LOCK_DURATION);
      failedLogins = 0;
    }
  }

  void recordSuccessfulLogin() {
    failedLogins = 0;
    lockedUntil = null;
  }
}
