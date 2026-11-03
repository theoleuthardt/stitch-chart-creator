package dev.theocloud.stitchchart.stitch;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A stitch of an account. Lines and circles are flat: four and three numbers per shape. */
@Entity
@Table(name = "custom_stitches")
class CustomStitch {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "owner_id", nullable = false, updatable = false)
  private UUID ownerId;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String abbreviation;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(nullable = false)
  private double[] lines;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(nullable = false)
  private double[] circles;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  protected CustomStitch() {}

  CustomStitch(UUID ownerId, StitchRequest request) {
    this.ownerId = ownerId;
    apply(request);
  }

  final void apply(StitchRequest request) {
    name = request.name();
    abbreviation = request.abbreviation();
    lines = flatten(request.lines());
    circles = flatten(request.circles());
  }

  private static double[] flatten(List<List<Double>> shapes) {
    return shapes.stream().flatMap(List::stream).mapToDouble(Double::doubleValue).toArray();
  }

  UUID getId() {
    return id;
  }

  String getName() {
    return name;
  }

  String getAbbreviation() {
    return abbreviation;
  }

  double[] getLines() {
    return lines;
  }

  double[] getCircles() {
    return circles;
  }
}
