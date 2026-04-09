import json
import requests
from datetime import datetime
from serpapi import GoogleSearch


CLIENT_ID = "PAR_autoplication_8e50261950fe13a7d6ed836d33cff2042e69f0a8198a577492ec9d9a290f30d9"
CLIENT_SECRET = "9b93cefa8ccad0f109c6d180e5635f8dfb11104293801f9651076bcebd1508e9"
SERP_API_KEY = "8ee1666f21e9e65d0e14e4117d57bb769c7426c41c113cc22c3f2f1d55541d3f"
OUTPUT_FILE = "public/offres.json"

KEYWORDS = ["data analyst", "ingenieur IA", "data engineer", "machine learning"]
LOCATION = "Lille, France"

def get_token_ft():
    res = requests.post(
        "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
        data={
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "scope": "api_offresdemploiv2 o2dsoffre",
        },
    )
    return res.json()["access_token"]

def get_offres_ft(token, keyword):
    res = requests.get(
        "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "motsCles": keyword,
            "commune": "59350",
            "distance": 30,
            "nbResultats": 10,
        },
    )
    if res.status_code != 200:
        return []

    offres = []
    for o in res.json().get("resultats", []):
        offres.append({
            "id": f"ft-{o.get('id')}",
            "titre": o.get("intitule", "N/A"),
            "entreprise": o.get("entreprise", {}).get("nom", "Non précisé"),
            "lieu": o.get("lieuTravail", {}).get("libelle", "N/A"),
            "contrat": o.get("typeContratLibelle", "N/A"),
            "source": "France Travail",
            "keyword": keyword,
            "lien": o.get("origineOffre", {}).get("urlOrigine", "#"),
            "date": datetime.now().strftime("%d/%m/%Y"),
        })
    return offres

def get_offres_indeed(keyword):
    try:
        search = GoogleSearch({
            "engine": "indeed",
            "q": keyword,
            "l": LOCATION,
            "api_key": SERP_API_KEY,
        })
        results = search.get_dict()
        offres = []
        for o in results.get("jobs_results", []):
            offres.append({
                "id": f"indeed-{o.get('job_id', keyword)}",
                "titre": o.get("title", "N/A"),
                "entreprise": o.get("company_name", "N/A"),
                "lieu": o.get("location", LOCATION),
                "contrat": o.get("job_type", "N/A"),
                "source": "Indeed",
                "keyword": keyword,
                "lien": o.get("related_links", [{}])[0].get("link", "#"),
                "date": datetime.now().strftime("%d/%m/%Y"),
            })
        return offres
    except Exception as e:
        print(f"Erreur Indeed ({keyword}): {e}")
        return []

def get_offres_google_jobs(keyword):
    try:
        search = GoogleSearch({
            "engine": "google_jobs",
            "q": f"{keyword} {LOCATION}",
            "hl": "fr",
            "api_key": SERP_API_KEY,
        })
        results = search.get_dict()
        offres = []
        for o in results.get("jobs_results", []):
            offres.append({
                "id": f"gj-{o.get('job_id', keyword)}",
                "titre": o.get("title", "N/A"),
                "entreprise": o.get("company_name", "N/A"),
                "lieu": o.get("location", LOCATION),
                "contrat": o.get("detected_extensions", {}).get("schedule_type", "N/A"),
                "source": "Google Jobs",
                "keyword": keyword,
                "lien": o.get("related_links", [{}])[0].get("link", "#"),
                "date": datetime.now().strftime("%d/%m/%Y"),
            })
        return offres
    except Exception as e:
        print(f"Erreur Google Jobs ({keyword}): {e}")
        return []

def main():
    print("Récupération des offres...")
    all_offres = []

    # France Travail
    token = get_token_ft()
    for keyword in KEYWORDS:
        offres = get_offres_ft(token, keyword)
        print(f"France Travail '{keyword}' : {len(offres)} offres")
        all_offres.extend(offres)

    # Indeed
    for keyword in KEYWORDS[:2]:
        offres = get_offres_indeed(keyword)
        print(f"Indeed '{keyword}' : {len(offres)} offres")
        all_offres.extend(offres)

    # Google Jobs
    for keyword in KEYWORDS[:2]:
        offres = get_offres_google_jobs(keyword)
        print(f"Google Jobs '{keyword}' : {len(offres)} offres")
        all_offres.extend(offres)

    # Dédoublonner
    seen = set()
    unique = []
    for o in all_offres:
        if o["id"] not in seen:
            seen.add(o["id"])
            unique.append(o)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "last_update": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "total": len(unique),
            "offres": unique,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n {len(unique)} offres uniques sauvegardées !")

if __name__ == "__main__":
    main()