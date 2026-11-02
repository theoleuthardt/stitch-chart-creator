package dev.theocloud.stitchchart.account;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/**
 * Data access for {@link UserAccount}. Usernames and e-mails compare through {@code lower()}, which
 * is what the unique indexes are built on.
 */
interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

  @Query("select count(u) > 0 from UserAccount u where lower(u.username) = lower(?1)")
  boolean usernameExists(String username);

  @Query("select count(u) > 0 from UserAccount u where lower(u.email) = lower(?1)")
  boolean emailExists(String email);

  @Query(
      "select count(u) > 0 from UserAccount u where u.id <> ?1 and lower(u.username) = lower(?2)")
  boolean usernameTakenByOther(UUID id, String username);

  @Query("select count(u) > 0 from UserAccount u where u.id <> ?1 and lower(u.email) = lower(?2)")
  boolean emailTakenByOther(UUID id, String email);

  @Query(
      "select u from UserAccount u where lower(u.username) = lower(?1) or lower(u.email) = lower(?1)")
  Optional<UserAccount> findByLogin(String login);

  /**
   * Counts a failed login in one atomic statement, so that parallel attempts cannot overwrite each
   * other, and locks the account once the limit is reached.
   */
  @Modifying
  @Query(
      """
      update UserAccount u
      set u.failedLogins = case when u.failedLogins + 1 >= :limit then 0
                                else u.failedLogins + 1 end,
          u.lockedUntil = case when u.failedLogins + 1 >= :limit then :lockedUntil
                               else u.lockedUntil end
      where u.id = :id
      """)
  void recordFailedLogin(UUID id, int limit, Instant lockedUntil);

  @Modifying
  @Query("update UserAccount u set u.failedLogins = 0, u.lockedUntil = null where u.id = :id")
  void recordSuccessfulLogin(UUID id);
}
