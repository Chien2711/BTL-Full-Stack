FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app
COPY TaskService.csproj .
RUN dotnet restore TaskService.csproj
COPY . .
RUN dotnet publish TaskService.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out .
EXPOSE 5002
ENTRYPOINT ["dotnet", "TaskService.dll"]
