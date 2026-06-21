FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app
COPY ProjectService.csproj .
RUN dotnet restore ProjectService.csproj
COPY . .
RUN dotnet publish ProjectService.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out .
EXPOSE 5001
ENTRYPOINT ["dotnet", "ProjectService.dll"]
