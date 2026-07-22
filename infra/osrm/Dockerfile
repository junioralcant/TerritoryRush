# OSRM (foot profile) for map-matching, baked for a single region.
#
# The region's processed .osrm files are built into the image (osrm-extract →
# partition → customize) so the container only has to serve. Only the small
# .osm.pbf is committed; the heavier .osrm.* artifacts are produced here.
#
# Railway: deploy as its own service with Root Directory = / (repo root, same as
# the api service) and Dockerfile Path = infra/osrm/Dockerfile. Paths below are
# relative to the repo root. It talks to the API over private networking, so it
# binds IPv6 (-i ::) and needs no public domain.
FROM ghcr.io/project-osrm/osrm-backend:v5.27.1

ARG OSRM_REGION=sao-mateus
ENV OSRM_REGION=${OSRM_REGION}
WORKDIR /data

COPY infra/osrm/${OSRM_REGION}.osm.pbf /data/${OSRM_REGION}.osm.pbf
RUN osrm-extract -p /opt/foot.lua /data/${OSRM_REGION}.osm.pbf \
 && osrm-partition /data/${OSRM_REGION}.osrm \
 && osrm-customize /data/${OSRM_REGION}.osrm \
 && rm -f /data/${OSRM_REGION}.osm.pbf

EXPOSE 5000
CMD ["sh", "-c", "osrm-routed --algorithm mld --max-matching-size 100000 -i :: /data/${OSRM_REGION}.osrm"]
