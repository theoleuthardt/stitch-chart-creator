package dev.theocloud.stitchchart.pattern;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/** Data access for {@link ShareLink}. */
interface ShareLinkRepository extends JpaRepository<ShareLink, UUID> {

  Optional<ShareLink> findBySlug(String slug);

  @Modifying
  @Query(
      value =
          "insert into share_links (pattern_id, slug) values (?1, ?2)"
              + " on conflict (pattern_id) do nothing",
      nativeQuery = true)
  void insertIfMissing(UUID patternId, String slug);

  @Query("select link.slug from ShareLink link where link.patternId = ?1")
  String findSlug(UUID patternId);
}
