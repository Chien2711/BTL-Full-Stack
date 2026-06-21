FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app
COPY NotifyService.csproj .
RUN dotnet restore NotifyService.csproj
COPY . .
RUN dotnet publish NotifyService.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out .
EXPOSE 5003
ENTRYPOINT ["dotnet", "NotifyService.dll"]
