package dev.theocloud.stitchchart.pattern;

import java.util.Arrays;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Stores the charts of an account. A pattern of somebody else behaves as if it did not exist. */
@Service
class PatternService {

  private final PatternRepository patterns;

  PatternService(PatternRepository patterns) {
    this.patterns = patterns;
  }

  @Transactional(readOnly = true)
  PatternResponses.Page list(UUID ownerId, int page, int size) {
    var result =
        patterns.findSummaries(
            ownerId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt")));
    return new PatternResponses.Page(result.getContent(), result.getTotalElements(), page, size);
  }

  @Transactional(readOnly = true)
  PatternResponses.Full get(UUID ownerId, UUID id) {
    return PatternResponses.Full.of(find(ownerId, id));
  }

  @Transactional
  PatternResponses.Full create(UUID ownerId, PatternRequest request) {
    validate(request);
    return PatternResponses.Full.of(patterns.saveAndFlush(new ChartPattern(ownerId, request)));
  }

  /** Saves a pattern. A version older than the stored one answers 409 instead of overwriting. */
  @Transactional
  PatternResponses.Full update(UUID ownerId, UUID id, PatternRequest request) {
    validate(request);
    if (request.version() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The version is missing");
    }
    ChartPattern pattern = find(ownerId, id);
    if (pattern.getVersion() != request.version()) {
      throw staleVersion();
    }
    pattern.apply(request);
    try {
      return PatternResponses.Full.of(patterns.saveAndFlush(pattern));
    } catch (ObjectOptimisticLockingFailureException raceWithAnotherSave) {
      throw staleVersion();
    }
  }

  /** Deletes in one statement, so that a save running at the same time cannot get in the way. */
  @Transactional
  void delete(UUID ownerId, UUID id) {
    if (patterns.deleteOwned(id, ownerId) == 0) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
  }

  private ChartPattern find(UUID ownerId, UUID id) {
    return patterns
        .findByIdAndOwnerId(id, ownerId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
  }

  /** The checks across fields that bean validation on the request cannot express. */
  private static void validate(PatternRequest request) {
    long cellCount = (long) request.width() * request.height();
    if (request.cells().length != cellCount) {
      throw invalid("cells must have width * height entries");
    }
    if (request.symbols() != null && request.symbols().length != cellCount) {
      throw invalid("symbols must have width * height entries");
    }
    if (request.symbols() != null && Arrays.stream(request.symbols()).anyMatch(id -> id < 0)) {
      throw invalid("symbols must not be negative");
    }
    int colors = request.palette().size();
    for (int cell : request.cells()) {
      if (cell < 0 || cell > colors) {
        throw invalid("cells must refer to the palette");
      }
    }
  }

  private static ResponseStatusException invalid(String reason) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
  }

  private static ResponseStatusException staleVersion() {
    return new ResponseStatusException(HttpStatus.CONFLICT, "The chart was changed elsewhere");
  }
}
