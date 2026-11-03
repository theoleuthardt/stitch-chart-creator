package dev.theocloud.stitchchart.pattern;

import static dev.theocloud.stitchchart.TestAccounts.signUp;
import static dev.theocloud.stitchchart.TestAccounts.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.theocloud.stitchchart.IntegrationTest;
import jakarta.servlet.http.Cookie;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.ObjectMapper;

@IntegrationTest
class ShareApiTests {

  private static final String CHART =
      """
      {"title":"Rose","craftType":"crossStitch","width":2,"height":1,
       "palette":["#ff0000"],"cells":[1,0],
       "thumbnail":"data:image/png;base64,AAAA",
       "gauge":{"stitchesPerUnit":22,"rowsPerUnit":30,"unit":"cm10"}}\
      """;

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  private String chart(Cookie session) throws Exception {
    return objectMapper
        .readTree(
            mockMvc
                .perform(
                    post("/api/patterns")
                        .cookie(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CHART))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString())
        .get("id")
        .asString();
  }

  private ResultActions share(Cookie session, String id) throws Exception {
    return mockMvc.perform(post("/api/patterns/" + id + "/share").cookie(session).with(csrf()));
  }

  private String slug(Cookie session, String id) throws Exception {
    return objectMapper
        .readTree(
            share(session, id)
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString())
        .get("slug")
        .asString();
  }

  private ResultActions shared(String slug) throws Exception {
    return mockMvc.perform(get("/api/share/" + slug));
  }

  @Test
  void aSharedChartCanBeReadWithoutAnAccount() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String slug = slug(session, chart(session));

    shared(slug)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Rose"))
        .andExpect(jsonPath("$.width").value(2))
        .andExpect(jsonPath("$.palette[0]").value("#ff0000"))
        .andExpect(jsonPath("$.cells[0]").value(1));
  }

  @Test
  void theResponseHoldsOnlyWhatTheChartNeeds() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String slug = slug(session, chart(session));

    shared(slug)
        .andExpect(jsonPath("$.id").doesNotExist())
        .andExpect(jsonPath("$.ownerId").doesNotExist())
        .andExpect(jsonPath("$.version").doesNotExist())
        .andExpect(jsonPath("$.createdAt").doesNotExist())
        .andExpect(jsonPath("$.updatedAt").doesNotExist())
        .andExpect(jsonPath("$.thumbnail").doesNotExist());
  }

  @Test
  void aSharedChartIsNotCached() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String slug = slug(session, chart(session));

    shared(slug).andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  void aSlugCannotBeGuessed() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());

    String slug = slug(session, chart(session));

    assertThat(slug).matches("[A-Za-z0-9_-]{22}");
  }

  @Test
  void sharingTwiceKeepsTheLink() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);

    assertThat(slug(session, id)).isEqualTo(slug(session, id));
  }

  @Test
  void sharingAtTheSameTimeGivesOneLink() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);

    Set<String> slugs = ConcurrentHashMap.newKeySet();
    try (ExecutorService pool = Executors.newFixedThreadPool(6)) {
      List<Callable<Integer>> requests =
          Collections.nCopies(
              6,
              () -> {
                MockHttpServletResponse response = share(session, id).andReturn().getResponse();
                slugs.add(
                    objectMapper.readTree(response.getContentAsString()).get("slug").asString());
                return response.getStatus();
              });
      for (Future<Integer> request : pool.invokeAll(requests)) {
        assertThat(request.get()).isEqualTo(200);
      }
    }

    assertThat(slugs).hasSize(1);
  }

  @Test
  void theOwnerSeesTheCurrentLink() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);
    String slug = slug(session, id);

    mockMvc
        .perform(get("/api/patterns/" + id + "/share").cookie(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.slug").value(slug));
  }

  @Test
  void aChartWithoutALinkSaysSo() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);

    mockMvc
        .perform(get("/api/patterns/" + id + "/share").cookie(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.slug").value(org.hamcrest.Matchers.nullValue()));
  }

  @Test
  void revokingALinkTakesEffectAtOnce() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);
    String slug = slug(session, id);

    mockMvc
        .perform(delete("/api/patterns/" + id + "/share").cookie(session).with(csrf()))
        .andExpect(status().isNoContent());

    shared(slug).andExpect(status().isNotFound());
  }

  @Test
  void aNewLinkAfterRevokingIsADifferentOne() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);
    String first = slug(session, id);
    mockMvc
        .perform(delete("/api/patterns/" + id + "/share").cookie(session).with(csrf()))
        .andExpect(status().isNoContent());

    assertThat(slug(session, id)).isNotEqualTo(first);
  }

  @Test
  void deletingAChartEndsItsLink() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);
    String slug = slug(session, id);

    mockMvc
        .perform(delete("/api/patterns/" + id).cookie(session).with(csrf()))
        .andExpect(status().isNoContent());

    shared(slug).andExpect(status().isNotFound());
  }

  @Test
  void aChartThatIsNotSharedCannotBeReached() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);

    shared(id).andExpect(status().isNotFound());
    shared("aaaaaaaaaaaaaaaaaaaaaa").andExpect(status().isNotFound());
    mockMvc.perform(get("/api/patterns/" + id)).andExpect(status().isUnauthorized());
  }

  @Test
  void aSharedChartShowsItsLatestState() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);
    String slug = slug(session, id);
    String stored =
        mockMvc
            .perform(get("/api/patterns/" + id).cookie(session))
            .andReturn()
            .getResponse()
            .getContentAsString();
    long version = objectMapper.readTree(stored).get("version").asLong();

    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/patterns/" + id)
                .cookie(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"title":"Tulip","craftType":"crossStitch","width":2,"height":1,
                     "palette":["#ff0000"],"cells":[1,1],"version":%d}\
                    """
                        .formatted(version)))
        .andExpect(status().isOk());

    shared(slug).andExpect(jsonPath("$.title").value("Tulip"));
  }

  @Test
  void onlyTheOwnerCanShare() throws Exception {
    String id = chart(signUp(mockMvc, uniqueName()));
    Cookie stranger = signUp(mockMvc, uniqueName());

    share(stranger, id).andExpect(status().isNotFound());
    mockMvc
        .perform(get("/api/patterns/" + id + "/share").cookie(stranger))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(delete("/api/patterns/" + id + "/share").cookie(stranger).with(csrf()))
        .andExpect(status().isNotFound());
  }

  @Test
  void readingSharedChartsIsRateLimitedPerAddress() throws Exception {
    int lastStatus = 0;
    for (int attempt = 0; attempt < 121; attempt++) {
      lastStatus =
          mockMvc
              .perform(
                  get("/api/share/nothing")
                      .with(request -> {
                        request.setRemoteAddr("10.77.0.1");
                        return request;
                      }))
              .andReturn()
              .getResponse()
              .getStatus();
    }

    assertThat(lastStatus).isEqualTo(429);
  }
}
