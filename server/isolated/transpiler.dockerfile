FROM eclipse-temurin:21-jre-alpine AS download
ARG KOTLIN_VERSION=2.0.21

RUN apk add --no-cache wget unzip
RUN wget "https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}/kotlin-compiler-${KOTLIN_VERSION}.zip" \
  && unzip kotlin-compiler-${KOTLIN_VERSION}.zip -d /


FROM eclipse-temurin:21-jre-alpine
VOLUME [ "/data" ]

RUN apk add --no-cache bash

ENV PATH="/usr/lib/kotlinc/bin:${PATH}"
COPY --from=download /kotlinc /usr/lib/kotlinc

COPY transpile.bash /app/transpile.bash
RUN chmod +x /app/transpile.bash

WORKDIR /data
CMD ["bash", "-c", "/app/transpile.bash -i /data/input/code.kt -o /data/js/ -l /usr/lib/kotlinc/lib/kotlin-stdlib-js.klib"]