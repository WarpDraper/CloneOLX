# Learn about building .NET container images:
# https://github.com/dotnet/dotnet-docker/blob/main/samples/README.md
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# copy csproj files and restore as distinct layers.
# All three project files are required: OLX.API references Olx.BLL and Olx.DAL,
# so restoring with only OLX.API.csproj present fails.
COPY ["OLX.API/OLX.API.csproj", "OLX.API/"]
COPY ["Olx.BLL/Olx.BLL.csproj", "Olx.BLL/"]
COPY ["Olx.DAL/Olx.DAL.csproj", "Olx.DAL/"]
RUN dotnet restore "OLX.API/OLX.API.csproj"

# copy everything else and build app
COPY . .
WORKDIR /source/OLX.API
RUN dotnet publish -c Release -o /app --no-restore


# final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
# postgresql-client 17 from PGDG: BackupDataService shells out to pg_dump/pg_restore,
# and the client major version must be >= the Neon server version.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt/ bookworm-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-17 \
    && apt-get purge -y gnupg && apt-get autoremove -y \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
COPY --from=build /app .

# Render terminates TLS at its edge and forwards plain HTTP to the container on $PORT.
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "OLX.API.dll"]
