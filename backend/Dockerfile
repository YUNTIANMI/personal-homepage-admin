# =============================================================================
# 多阶段构建：
#   阶段一（build）用 Maven 编译打包，产出可执行 jar；
#   阶段二（run）用精简 JRE 运行，镜像更小、不含源码与构建工具。
# =============================================================================
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# 先复制 pom 拉取依赖（利用 Docker 层缓存，源码变动时无需重新拉依赖）
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B package -DskipTests

# =============================================================================
FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
