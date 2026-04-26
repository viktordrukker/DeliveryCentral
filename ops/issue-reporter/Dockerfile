FROM alpine:3.19

RUN apk add --no-cache bash curl jq docker-cli coreutils

WORKDIR /app
COPY report.sh /app/report.sh
RUN chmod +x /app/report.sh

ENV ISSUE_REPORTER_ENVIRONMENT=preprod \
    ISSUE_REPORTER_LOG_LINES=200 \
    ISSUE_REPORTER_OWN_CONTAINER=deliverycentral-issue-reporter

ENTRYPOINT ["/app/report.sh"]
