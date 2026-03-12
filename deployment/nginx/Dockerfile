FROM nginx:alpine

# openssl is already available in nginx:alpine (used by the ssl module)
# but we ensure the CLI tool is present for our entrypoint script
RUN apk add --no-cache openssl

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
