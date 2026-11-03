package dev.theocloud.stitchchart.pattern;

import jakarta.validation.constraints.NotNull;

/** How far a chart has been stitched. Rows count from 0, cells are flat indices as in the chart. */
record ProgressRequest(@NotNull int[] doneRows, @NotNull int[] doneCells, int currentRow) {}
