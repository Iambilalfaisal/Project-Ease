from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

client = SearchClient(
    "https://project-ease-search.search.windows.net",
    "project-ease-index",
    AzureKeyCredential("leQF9W5kHefid2ig2TMX4EtqmObViu59sL4bKkf6veAzSeDswZTj")
)

results = list(client.search("*", top=5))
print("Documents found:", len(results))
for r in results:
    print("-", r.get("sourcepage", "no-sourcepage"), str(r.get("content", ""))[:100])
