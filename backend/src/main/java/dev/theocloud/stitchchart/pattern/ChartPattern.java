package dev.theocloud.stitchchart.pattern;

import dev.theocloud.stitchchart.stitch.EmbeddedStitch;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A chart of one account. See docs/CONCEPT.md for the meaning of the flat cell arrays. */
@Entity
@Table(name = "patterns")
class ChartPattern {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "owner_id", nullable = false, updatable = false)
  private UUID ownerId;

  @Column(nullable = false)
  private String title;

  @Column(name = "craft_type", nullable = false)
  private String craftType;

  @Column(nullable = false)
  private int width;

  @Column(nullable = false)
  private int height;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(nullable = false)
  private String[] palette;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(nullable = false)
  private int[] cells;

  @JdbcTypeCode(SqlTypes.ARRAY)
  private int[] symbols;

  @Convert(converter = EmbeddedStitchesConverter.class)
  @Column(name = "custom_stitches", nullable = false)
  private List<EmbeddedStitch> customStitches = List.of();

  private String thumbnail;

  @Version private long version;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  protected ChartPattern() {}

  ChartPattern(UUID ownerId, PatternRequest request) {
    this.ownerId = ownerId;
    apply(request);
  }

  /** Takes over the content of a save. Touching the timestamp always raises the version. */
  final void apply(PatternRequest request) {
    title = request.title();
    craftType = request.craftType();
    width = request.width();
    height = request.height();
    palette = request.palette().toArray(String[]::new);
    cells = request.cells();
    symbols = request.symbols();
    customStitches = request.customStitches() == null ? List.of() : request.customStitches();
    thumbnail = request.thumbnail();
    updatedAt = Instant.now();
  }

  UUID getId() {
    return id;
  }

  String getTitle() {
    return title;
  }

  String getCraftType() {
    return craftType;
  }

  int getWidth() {
    return width;
  }

  int getHeight() {
    return height;
  }

  String[] getPalette() {
    return palette;
  }

  int[] getCells() {
    return cells;
  }

  int[] getSymbols() {
    return symbols;
  }

  List<EmbeddedStitch> getCustomStitches() {
    return customStitches;
  }

  String getThumbnail() {
    return thumbnail;
  }

  long getVersion() {
    return version;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }
}
