package dev.theocloud.stitchchart.pattern;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/** Data access for {@link ChartPattern}, always scoped to the owner. */
interface PatternRepository extends JpaRepository<ChartPattern, UUID> {

  Optional<ChartPattern> findByIdAndOwnerId(UUID id, UUID ownerId);

  @Modifying
  @Query("delete from ChartPattern p where p.id = ?1 and p.ownerId = ?2")
  int deleteOwned(UUID id, UUID ownerId);

  @Query(
      """
      select new dev.theocloud.stitchchart.pattern.PatternResponses$Summary(
          p.id, p.title, p.craftType, p.width, p.height, p.thumbnail, p.updatedAt)
      from ChartPattern p where p.ownerId = ?1
      """)
  Page<PatternResponses.Summary> findSummaries(UUID ownerId, Pageable pageable);
}
