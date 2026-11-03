package dev.theocloud.stitchchart.pattern;

import dev.theocloud.stitchchart.account.AccountPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** CRUD on the charts of the signed-in user. */
@RestController
@RequestMapping("/api/patterns")
class PatternController {

  private final PatternService patternService;

  PatternController(PatternService patternService) {
    this.patternService = patternService;
  }

  @GetMapping
  PatternResponses.Page list(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
    return patternService.list(principal.id(), page, size);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  PatternResponses.Full create(
      @AuthenticationPrincipal AccountPrincipal principal,
      @Valid @RequestBody PatternRequest body) {
    return patternService.create(principal.id(), body);
  }

  @GetMapping("/{id}")
  PatternResponses.Full get(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID id) {
    return patternService.get(principal.id(), id);
  }

  @PutMapping("/{id}")
  PatternResponses.Full update(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody PatternRequest body) {
    return patternService.update(principal.id(), id, body);
  }

  @GetMapping("/{id}/progress")
  PatternResponses.Progress getProgress(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID id) {
    return patternService.getProgress(principal.id(), id);
  }

  @PutMapping("/{id}/progress")
  PatternResponses.Progress saveProgress(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody ProgressRequest body) {
    patternService.saveProgress(principal.id(), id, body);
    return new PatternResponses.Progress(body.doneRows(), body.doneCells(), body.currentRow());
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(@AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID id) {
    patternService.delete(principal.id(), id);
  }
}
