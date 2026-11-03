package dev.theocloud.stitchchart.stitch;

import dev.theocloud.stitchchart.account.AccountPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** The custom stitches of the signed-in user. */
@RestController
@RequestMapping("/api/stitches")
class StitchController {

  private final CustomStitchRepository stitches;

  StitchController(CustomStitchRepository stitches) {
    this.stitches = stitches;
  }

  @GetMapping
  @Transactional(readOnly = true)
  List<StitchResponse> list(@AuthenticationPrincipal AccountPrincipal principal) {
    return stitches.findByOwnerIdOrderByCreatedAt(principal.id()).stream()
        .map(StitchResponse::of)
        .toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  StitchResponse create(
      @AuthenticationPrincipal AccountPrincipal principal, @Valid @RequestBody StitchRequest body) {
    return StitchResponse.of(stitches.save(new CustomStitch(principal.id(), body)));
  }

  @PutMapping("/{id}")
  @Transactional
  StitchResponse update(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody StitchRequest body) {
    CustomStitch stitch = find(principal, id);
    stitch.apply(body);
    return StitchResponse.of(stitch);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  void delete(@AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID id) {
    stitches.delete(find(principal, id));
  }

  private CustomStitch find(AccountPrincipal principal, UUID id) {
    return stitches
        .findByIdAndOwnerId(id, principal.id())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
  }
}
