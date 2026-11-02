package dev.theocloud.stitchchart.account;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Data access for {@link UserAccount}. Usernames and e-mails compare without case. */
interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

  boolean existsByUsernameIgnoreCase(String username);

  boolean existsByEmailIgnoreCase(String email);

  @Query(
      "select u from UserAccount u where lower(u.username) = lower(?1) or lower(u.email) = lower(?1)")
  Optional<UserAccount> findByLogin(String login);
}
