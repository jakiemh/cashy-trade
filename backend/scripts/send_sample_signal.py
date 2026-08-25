import httpx

SAMPLE = {
    "type": "COMPRA",
    "symbol": "PLTR",
    "entry_price": 148.59,
    "stop_loss": 136.26,
    "stop_pct": -8.3,
    "take_profit": 197.90,
    "tp_pct": 33.2,
    "rr_ratio": 4,
    "strategy": "2.5_OpeningBBHigh",
    "setup_name": "Ruptura de apertura (Bollinger)",
}


def main():
    url = "http://localhost:8000/api/signals"
    response = httpx.post(
        url,
        json=SAMPLE,
        headers={"Authorization": "Bearer cashy-bot-dev-key"},
        timeout=10,
    )
    print(response.status_code, response.text)


if __name__ == "__main__":
    main()
