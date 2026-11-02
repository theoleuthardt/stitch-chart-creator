package dev.theocloud.stitchchart.account;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Creates accounts and checks credentials. */
@Service
public class AccountService {

  /** Failed logins in a row that lock an account. */
  private static final int MAX_FAILED_LOGINS = 5;

  /** How long a locked account stays locked. */
  private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

  private final UserAccountRepository accounts;
  private final PasswordEncoder passwordEncoder;
  private final String unknownUserHash;

  AccountService(UserAccountRepository accounts, PasswordEncoder passwordEncoder) {
    this.accounts = accounts;
    this.passwordEncoder = passwordEncoder;
    this.unknownUserHash = passwordEncoder.encode("no account has this password");
  }

  /** Creates an account; a taken username or e-mail answers 409. */
  @Transactional
  public UserAccount register(AuthRequests.Register request) {
    if (accounts.usernameExists(request.username()) || accounts.emailExists(request.email())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Username or e-mail is already taken");
    }
    try {
      return accounts.saveAndFlush(
          new UserAccount(
              request.username(), request.email(), passwordEncoder.encode(request.password())));
    } catch (DataIntegrityViolationException raceWithAnotherRegistration) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Username or e-mail is already taken");
    }
  }

  /**
   * Checks a login. Unknown users cost the same hash work as known ones and every failure answers
   * the same 401, so that a response never reveals whether an account exists or is locked.
   */
  @Transactional(noRollbackFor = ResponseStatusException.class)
  public UserAccount authenticate(AuthRequests.Login request) {
    Instant now = Instant.now();
    UserAccount account = accounts.findByLogin(request.username()).orElse(null);
    String hash = account == null ? unknownUserHash : account.getPasswordHash();
    boolean matches = passwordEncoder.matches(request.password(), hash);

    if (account == null || account.isLocked(now)) {
      throw invalidCredentials();
    }
    if (!matches) {
      accounts.recordFailedLogin(account.getId(), MAX_FAILED_LOGINS, now.plus(LOCK_DURATION));
      throw invalidCredentials();
    }
    accounts.recordSuccessfulLogin(account.getId());
    return account;
  }

  /** Loads the account of the session; a deleted account answers 401. */
  @Transactional(readOnly = true)
  public UserAccount get(UUID id) {
    return accounts
        .findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  }

  private static ResponseStatusException invalidCredentials() {
    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
  }
}
