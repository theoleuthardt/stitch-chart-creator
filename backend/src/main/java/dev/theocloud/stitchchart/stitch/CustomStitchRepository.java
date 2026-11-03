package dev.theocloud.stitchchart.stitch;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Data access for {@link CustomStitch}, always scoped to the owner. */
interface CustomStitchRepository extends JpaRepository<CustomStitch, UUID> {

  List<CustomStitch> findByOwnerIdOrderByCreatedAt(UUID ownerId);

  Optional<CustomStitch> findByIdAndOwnerId(UUID id, UUID ownerId);
}
