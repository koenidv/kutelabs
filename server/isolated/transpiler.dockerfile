FROM eclipse-temurin:21-jre-alpine AS download
ARG KOTLIN_VERSION=2.1.0
ARG KOTLINX_VERSION=1.10.1

RUN apk add --no-cache wget unzip
RUN wget "https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}/kotlin-compiler-${KOTLIN_VERSION}.zip" \
  && unzip kotlin-compiler-${KOTLIN_VERSION}.zip -d /
RUN wget -O lib/kotlinx-coroutines-core-js.klib \
  "https://repo1.maven.org/maven2/org/jetbrains/kotlinx/kotlinx-coroutines-core-js/${KOTLINX_VERSION}/kotlinx-coroutines-core-js-${KOTLINX_VERSION}.klib"


FROM eclipse-temurin:21-jre-alpine
VOLUME [ "/data" ]
ENV INCLUDE_COROUTINE_LIB="false"

RUN apk add --no-cache bash

#RUN addgroup -S -g 101 kutegroup && adduser -S -u 100 kute -G kutegroup

ENV PATH="/usr/lib/kotlinc/bin:${PATH}"
COPY --from=download /kotlinc /usr/lib/kotlinc
COPY --from=download /lib /usr/lib/kotlinc/lib

#RUN mkdir -p /app /data \
#  && chown -R kute:kutegroup /app /data

COPY transpile.bash /app/transpile.bash
RUN chmod +x /app/transpile.bash 
#&& chown kute:kutegroup /app/transpile.bash

WORKDIR /data
#USER kute

CMD [ \
"bash", "-c", \
"LIB_PATH='/usr/lib/kotlinc/lib/kotlin-stdlib-js.klib'; \
if [ \"$INCLUDE_COROUTINE_LIB\" = \"true\" ]; then \
  LIB_PATH=\"$LIB_PATH:/usr/lib/kotlinc/lib/kotlinx-coroutines-core-js.klib\"; \
fi; \
cat /data/input/code.kt; \
/app/transpile.bash -i /data/input/code.kt -o /data/js/ -l \"$LIB_PATH\"" \
]