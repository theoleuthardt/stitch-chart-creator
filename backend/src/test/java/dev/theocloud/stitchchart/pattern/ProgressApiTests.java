package dev.theocloud.stitchchart.pattern;

import static dev.theocloud.stitchchart.TestAccounts.signUp;
import static dev.theocloud.stitchchart.TestAccounts.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.theocloud.stitchchart.IntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

@IntegrationTest
class ProgressApiTests {

  private static final String CHART =
      """
      {"title":"Rose","craftType":"crossStitch","width":2,"height":3,
       "palette":["#ff0000"],"cells":[1,1,1,1,1,1]}\
      """;

  private static final String PROGRESS =
      """
      {"doneRows":[0],"doneCells":[3],"currentRow":1}\
      """;

  @Autowired private MockMvc mockMvc;
  @Autowired private JdbcTemplate jdbcTemplate;
  @Autowired private ObjectMapper objectMapper;

  private ResultActions send(MockHttpServletRequestBuilder request, Cookie session, String body)
      throws Exception {
    return mockMvc.perform(
        request.cookie(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body));
  }

  private String chart(Cookie session) throws Exception {
    return objectMapper
        .readTree(
            send(post("/api/patterns"), session, CHART)
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString())
        .get("id")
        .asString();
  }

  private String progress(String id) {
    return "/api/patterns/" + id + "/progress";
  }

  @Test
  void aNewChartHasNoProgress() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);

    mockMvc
        .perform(get(progress(id)).cookie(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.doneRows", hasSize(0)))
        .andExpect(jsonPath("$.doneCells", hasSize(0)))
        .andExpect(jsonPath("$.currentRow").value(0));
  }

  @Test
  void progressIsKept() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);

    send(put(progress(id)), session, PROGRESS).andExpect(status().isOk());

    mockMvc
        .perform(get(progress(id)).cookie(session))
        .andExpect(jsonPath("$.doneRows[0]").value(0))
        .andExpect(jsonPath("$.doneCells[0]").value(3))
        .andExpect(jsonPath("$.currentRow").value(1));
  }

  @Test
  void savingAgainReplacesTheProgress() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);
    send(put(progress(id)), session, PROGRESS).andExpect(status().isOk());

    send(put(progress(id)), session, "{\"doneRows\":[],\"doneCells\":[],\"currentRow\":2}")
        .andExpect(status().isOk());

    mockMvc
        .perform(get(progress(id)).cookie(session))
        .andExpect(jsonPath("$.doneRows", hasSize(0)))
        .andExpect(jsonPath("$.currentRow").value(2));
  }

  @Test
  void progressOutsideTheChartIsRejected() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);

    String[] invalid = {
      PROGRESS.replace("\"doneRows\":[0]", "\"doneRows\":[3]"),
      PROGRESS.replace("\"doneRows\":[0]", "\"doneRows\":[-1]"),
      PROGRESS.replace("\"doneCells\":[3]", "\"doneCells\":[6]"),
      PROGRESS.replace("\"doneCells\":[3]", "\"doneCells\":[-1]"),
      PROGRESS.replace("\"currentRow\":1", "\"currentRow\":3"),
      PROGRESS.replace("\"currentRow\":1", "\"currentRow\":-1"),
      "{\"doneRows\":null,\"doneCells\":[],\"currentRow\":0}",
      "{\"doneRows\":[0,0,0,0],\"doneCells\":[],\"currentRow\":0}",
      "{\"doneRows\":[],\"doneCells\":[0,0,0,0,0,0,0],\"currentRow\":0}",
    };

    for (String body : invalid) {
      send(put(progress(id)), session, body).andExpect(status().isBadRequest());
    }
  }

  @Test
  void progressThatNoLongerFitsAfterAResizeIsDropped() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);
    send(put(progress(id)), session, "{\"doneRows\":[2],\"doneCells\":[5],\"currentRow\":2}")
        .andExpect(status().isOk());
    long version =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/patterns/" + id).cookie(session))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("version")
            .asLong();

    send(
            put("/api/patterns/" + id),
            session,
            """
            {"title":"Rose","craftType":"crossStitch","width":2,"height":1,
             "palette":["#ff0000"],"cells":[1,1],"version":%d}\
            """
                .formatted(version))
        .andExpect(status().isOk());

    mockMvc
        .perform(get(progress(id)).cookie(session))
        .andExpect(jsonPath("$.doneRows", hasSize(0)))
        .andExpect(jsonPath("$.doneCells", hasSize(0)))
        .andExpect(jsonPath("$.currentRow").value(0));
  }

  @Test
  void aChangedWidthStartsTheProgressOver() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);
    send(put(progress(id)), session, "{\"doneRows\":[0],\"doneCells\":[1],\"currentRow\":1}")
        .andExpect(status().isOk());
    long version =
        objectMapper
            .readTree(
                mockMvc
                    .perform(get("/api/patterns/" + id).cookie(session))
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("version")
            .asLong();

    send(
            put("/api/patterns/" + id),
            session,
            """
            {"title":"Rose","craftType":"crossStitch","width":3,"height":2,
             "palette":["#ff0000"],"cells":[1,1,1,1,1,1],"version":%d}\
            """
                .formatted(version))
        .andExpect(status().isOk());

    mockMvc
        .perform(get(progress(id)).cookie(session))
        .andExpect(jsonPath("$.doneRows", hasSize(0)))
        .andExpect(jsonPath("$.doneCells", hasSize(0)))
        .andExpect(jsonPath("$.currentRow").value(0));
  }

  @Test
  void anotherUsersChartLooksLikeItDoesNotExist() throws Exception {
    String id = chart(signUp(mockMvc, uniqueName()));
    Cookie stranger = signUp(mockMvc, uniqueName());

    mockMvc.perform(get(progress(id)).cookie(stranger)).andExpect(status().isNotFound());
    send(put(progress(id)), stranger, PROGRESS).andExpect(status().isNotFound());
  }

  @Test
  void deletingAChartDeletesItsProgress() throws Exception {
    Cookie session = signUp(mockMvc, uniqueName());
    String id = chart(session);
    send(put(progress(id)), session, PROGRESS).andExpect(status().isOk());

    mockMvc
        .perform(delete("/api/patterns/" + id).cookie(session).with(csrf()))
        .andExpect(status().isNoContent());

    assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from pattern_progress where pattern_id = ?::uuid",
                Integer.class,
                id))
        .isZero();
  }

  @Test
  void progressNeedsASession() throws Exception {
    mockMvc
        .perform(get("/api/patterns/00000000-0000-0000-0000-000000000000/progress"))
        .andExpect(status().isUnauthorized());
  }
}
