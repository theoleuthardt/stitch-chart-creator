package dev.theocloud.stitchchart.pattern;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** How far a chart has been stitched: finished rows, single finished cells, the current row. */
@Entity
@Table(name = "pattern_progress")
class PatternProgress {

  @Id
  @Column(name = "pattern_id")
  private UUID patternId;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(name = "done_rows", nullable = false)
  private int[] doneRows;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(name = "done_cells", nullable = false)
  private int[] doneCells;

  @Column(name = "current_row", nullable = false)
  private int currentRow;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  protected PatternProgress() {}

  PatternProgress(UUID patternId) {
    this.patternId = patternId;
  }

  void apply(ProgressRequest request) {
    doneRows = request.doneRows();
    doneCells = request.doneCells();
    currentRow = request.currentRow();
    updatedAt = Instant.now();
  }

  int[] getDoneRows() {
    return doneRows;
  }

  int[] getDoneCells() {
    return doneCells;
  }

  int getCurrentRow() {
    return currentRow;
  }
}
