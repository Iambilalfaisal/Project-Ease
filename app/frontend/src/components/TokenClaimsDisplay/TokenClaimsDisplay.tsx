import { useMsal } from "@azure/msal-react";
import { getTokenClaims } from "../../authConfig";
import { useState, useEffect } from "react";
import { Table } from "@/components/ui";

type Claim = {
    name: string;
    value: string;
};

export const TokenClaimsDisplay = () => {
    const { instance } = useMsal();
    const [claims, setClaims] = useState<Record<string, unknown> | undefined>(undefined);

    useEffect(() => {
        const fetchClaims = async () => {
            setClaims(await getTokenClaims(instance));
        };

        fetchClaims();
    }, []);

    const ToString = (a: string | any) => {
        if (typeof a === "string") {
            return a;
        } else {
            return JSON.stringify(a);
        }
    };

    let createClaims = (o: Record<string, unknown> | undefined) => {
        return Object.keys(o ?? {}).map((key: string) => {
            let originalKey = key;
            try {
                // Some claim names may be a URL to a full schema, just use the last part of the URL in this case
                const url = new URL(key);
                const parts = url.pathname.split("/");
                key = parts[parts.length - 1];
            } catch (error) {
                // Do not parse key if it's not a URL
            }
            return { name: key, value: ToString((o ?? {})[originalKey]) };
        });
    };
    const items: Claim[] = createClaims(claims).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="mt-5">
            <div className="mb-2 text-sm font-weight-semibold text-ink-2">ID Token Claims</div>
            <Table empty={items.length === 0} dense>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.name}>
                            <td>{item.name}</td>
                            <td>{item.value}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};
