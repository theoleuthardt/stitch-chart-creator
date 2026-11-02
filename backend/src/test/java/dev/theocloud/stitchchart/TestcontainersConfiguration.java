package dev.theocloud.stitchchart;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Starts the real PostgreSQL of the integration tests. One container serves every Spring context of
 * a test run, and it is stopped with the last one.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

  private static final PostgreSQLContainer POSTGRES =
      new PostgreSQLContainer(DockerImageName.parse("postgres:18-alpine"));

  static {
    POSTGRES.start();
    Runtime.getRuntime().addShutdownHook(new Thread(POSTGRES::stop));
  }

  @Bean(destroyMethod = "")
  @ServiceConnection
  PostgreSQLContainer postgresContainer() {
    return POSTGRES;
  }
}
