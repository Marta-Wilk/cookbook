package com.cookbook.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
@Slf4j
public class DataSourceConfig {

    @Value("${app.datasource.postgres.url:}")
    private String postgresUrl;

    @Value("${app.datasource.postgres.username:postgres}")
    private String postgresUsername;

    @Value("${app.datasource.postgres.password:}")
    private String postgresPassword;

    @Value("${app.datasource.h2.url}")
    private String h2Url;

    @Bean
    @Primary
    public DataSource dataSource() {
        if (!postgresUrl.isBlank()) {
            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(postgresUrl);
            config.setUsername(postgresUsername);
            config.setPassword(postgresPassword);
            config.setConnectionTimeout(3_000);
            config.setInitializationFailTimeout(-1);
            config.addDataSourceProperty("connectTimeout", "3");
            config.addDataSourceProperty("socketTimeout", "5");
            config.setMaximumPoolSize(5);
            HikariDataSource ds = new HikariDataSource(config);
            try {
                ds.getConnection().close();
                log.info("Database: PostgreSQL ({})", postgresUrl);
                return ds;
            } catch (Exception e) {
                ds.close();
                log.warn("PostgreSQL unavailable ({}). Falling back to H2 file-based.", e.getMessage());
            }
        }
        log.info("Database: H2 file-based ({})", h2Url);
        HikariConfig h2Config = new HikariConfig();
        h2Config.setJdbcUrl(h2Url);
        h2Config.setUsername("sa");
        h2Config.setPassword("");
        return new HikariDataSource(h2Config);
    }
}
