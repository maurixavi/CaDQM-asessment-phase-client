import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ContextComponentsService {
  private contextData = [
    {
        id: 1,
        version: "CTX_v1.0",
        application_domains: [
            { id: 1, name: "Healthcare" }
        ],
        business_rules: [
            { id: 1, statement: "ATB ∈ {“amika”, “vanco”, “genta”}", semantic: "The only drugs studied are three antibiotics: “amika”, “vanco”, OR “genta”." },
            { id: 2, statement: "CBFConc ≠ NULL → ATB = “vanco”", semantic: "If the drug concentration corresponding to the cerebrospinal fluid is not NULL, then the antibiotic studied is “vanco”." }
        ],
        user_types: [
            { id: 1, name: "Collector", characteristics: "Doctor" },
            { id: 2, name: "Analyst", characteristics: "Data Scientist" }
        ],
        dq_metadata: [
            { id: 1, path: "/dqmetadata/healthcare", description: "Metadata for healthcare DQ", describe: "Dataset for healthcare quality measurements" }
        ],
        other_metadata: [
            { id: 1, path: "/metadata/healthcare", description: "General metadata for healthcare", author: "Healthcare Organization", last_update: "2023-05-01", describe: "Healthcare dataset" }
        ],
        other_data: [
            { id: 1, path: "/data/healthcare", description: "Healthcare data", owner: "Healthcare Institute" }
        ]
    }/*,
    {
        id: 2,
        version: "CTX_v2.0",
        application_domains: [
            { id: 2, name: "Education" }
        ],
        business_rules: [
            { id: 3, statement: "Student GPA ≥ 3.0", semantic: "Only students with a GPA of 3.0 or higher are considered." }
        ],
        user_types: [
            { id: 3, name: "Teacher", characteristics: "Educator" }
        ],
        dq_metadata: [
            { id: 2, path: "/dqmetadata/education", description: "Metadata for education DQ", describe: "Dataset for education quality measurements" }
        ],
        other_metadata: [
            { id: 2, path: "/metadata/education", description: "General metadata for education", author: "Education Board", last_update: "2024-02-15", describe: "Education dataset" }
        ],
        other_data: [
            { id: 2, path: "/data/education", description: "Education data", owner: "Education Department" }
        ]
    }*/
  ];

  getContextData() {
    return this.contextData;
  }
}
