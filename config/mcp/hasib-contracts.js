// Generated from the existing Hasib validators. Run npm run gen:mcp.
export const HASIB_FIELDS = {
  "resourceId": {
    "type": "string",
    "maxLength": 100000
  },
  "resourceIds": {
    "type": "array",
    "items": {
      "type": "string",
      "maxLength": 100000
    },
    "maxItems": 500
  },
  "serviceId": {
    "type": "string",
    "maxLength": 100000
  },
  "bookingId": {
    "type": "string",
    "maxLength": 100000
  },
  "waitlistId": {
    "type": "string",
    "maxLength": 100000
  },
  "membershipId": {
    "type": "string",
    "maxLength": 100000
  },
  "guardianId": {
    "type": "string",
    "maxLength": 100000
  },
  "creditId": {
    "type": "string",
    "maxLength": 100000
  },
  "followupId": {
    "type": "string",
    "maxLength": 100000
  },
  "kind": {
    "type": "string",
    "maxLength": 100000
  },
  "name": {
    "type": "string",
    "maxLength": 100000
  },
  "capacity": {
    "type": "number"
  },
  "availability": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "startsAt": {
          "type": "number"
        },
        "endsAt": {
          "type": "number"
        }
      },
      "required": [
        "startsAt",
        "endsAt"
      ],
      "additionalProperties": false
    },
    "maxItems": 500
  },
  "durationMinutes": {
    "type": "number"
  },
  "startsAt": {
    "type": "number"
  },
  "endsAt": {
    "type": "number"
  },
  "earliestAt": {
    "type": "number"
  },
  "latestAt": {
    "type": "number"
  },
  "credits": {
    "type": "number"
  },
  "attendedAt": {
    "type": "number"
  },
  "replacementForId": {
    "type": "string",
    "maxLength": 100000
  },
  "linkedType": {
    "anyOf": [
      {
        "const": "booking"
      },
      {
        "const": "membership"
      },
      {
        "const": "order"
      },
      {
        "const": "job"
      },
      {
        "const": "property"
      },
      {
        "const": "opportunity"
      },
      {
        "const": "production"
      }
    ]
  },
  "linkedId": {
    "type": "string",
    "maxLength": 100000
  },
  "fromAt": {
    "type": "number"
  },
  "toAt": {
    "type": "number"
  },
  "approvedBy": {
    "type": "string",
    "maxLength": 100000
  },
  "checklist": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "text": {
          "type": "string",
          "maxLength": 100000
        },
        "done": {
          "type": "boolean"
        }
      },
      "required": [
        "text",
        "done"
      ],
      "additionalProperties": false
    },
    "maxItems": 500
  },
  "workflow": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "maxLength": 100000
      },
      "kind": {
        "type": "string",
        "maxLength": 100000
      },
      "label": {
        "type": "string",
        "maxLength": 100000
      },
      "identifier": {
        "type": "string",
        "maxLength": 100000
      },
      "location": {
        "type": "string",
        "maxLength": 100000
      },
      "availability": {
        "anyOf": [
          {
            "type": "string",
            "maxLength": 100000
          },
          {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "startsAt": {
                  "type": "number"
                },
                "endsAt": {
                  "type": "number"
                }
              },
              "required": [
                "startsAt",
                "endsAt"
              ],
              "additionalProperties": false
            },
            "maxItems": 500
          }
        ]
      },
      "status": {
        "type": "string",
        "maxLength": 100000
      },
      "viewingOutcome": {
        "type": "string",
        "maxLength": 100000
      },
      "approvedBy": {
        "type": "string",
        "maxLength": 100000
      },
      "contactId": {
        "type": "string",
        "maxLength": 100000
      },
      "conversationId": {
        "type": "string",
        "maxLength": 100000
      },
      "assignedAccountId": {
        "type": "string",
        "maxLength": 100000
      },
      "equipmentId": {
        "type": "string",
        "maxLength": 100000
      },
      "repeatOfId": {
        "type": "string",
        "maxLength": 100000
      },
      "propertyId": {
        "type": "string",
        "maxLength": 100000
      },
      "opportunityId": {
        "type": "string",
        "maxLength": 100000
      },
      "variantId": {
        "type": "string",
        "maxLength": 100000
      },
      "orderId": {
        "type": "string",
        "maxLength": 100000
      },
      "dueAt": {
        "type": "number"
      },
      "recurringDays": {
        "type": "number"
      },
      "actualMinutes": {
        "type": "number"
      },
      "budgetMinor": {
        "type": "number"
      },
      "nextServiceAt": {
        "type": "number"
      },
      "visitsRemaining": {
        "type": "number"
      },
      "askingPriceMinor": {
        "type": "number"
      },
      "viewingAt": {
        "type": "number"
      },
      "followUpAt": {
        "type": "number"
      },
      "commissionMinor": {
        "type": "number"
      },
      "qty": {
        "type": "number"
      },
      "estimateVersion": {
        "type": "number"
      },
      "reference": {
        "type": "string",
        "maxLength": 100000
      },
      "transactionType": {
        "type": "string",
        "maxLength": 100000
      },
      "propertyType": {
        "type": "string",
        "maxLength": 100000
      },
      "area": {
        "type": "string",
        "maxLength": 100000
      },
      "pricePeriod": {
        "type": "string",
        "maxLength": 100000
      },
      "description": {
        "type": "string",
        "maxLength": 100000
      },
      "authorityStatus": {
        "type": "string",
        "maxLength": 100000
      },
      "source": {
        "type": "string",
        "maxLength": 100000
      },
      "need": {
        "type": "string",
        "maxLength": 100000
      },
      "financeReadiness": {
        "type": "string",
        "maxLength": 100000
      },
      "decisionMakerReadiness": {
        "type": "string",
        "maxLength": 100000
      },
      "timeline": {
        "type": "string",
        "maxLength": 100000
      },
      "nextAction": {
        "type": "string",
        "maxLength": 100000
      },
      "lostReason": {
        "type": "string",
        "maxLength": 100000
      },
      "outcome": {
        "type": "string",
        "maxLength": 100000
      },
      "terms": {
        "type": "string",
        "maxLength": 100000
      },
      "text": {
        "type": "string",
        "maxLength": 100000
      },
      "templateId": {
        "type": "string",
        "maxLength": 100000
      },
      "budgetMinMinor": {
        "type": "number"
      },
      "budgetMaxMinor": {
        "type": "number"
      },
      "bedrooms": {
        "type": "number"
      },
      "bathrooms": {
        "type": "number"
      },
      "sizeSqm": {
        "type": "number"
      },
      "verificationAt": {
        "type": "number"
      },
      "firstInboundAt": {
        "type": "number"
      },
      "replyQueuedAt": {
        "type": "number"
      },
      "providerSubmittedAt": {
        "type": "number"
      },
      "deliveredAt": {
        "type": "number"
      },
      "scheduledAt": {
        "type": "number"
      },
      "amountMinor": {
        "type": "number"
      },
      "decisionDueAt": {
        "type": "number"
      },
      "areas": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 100000
        },
        "maxItems": 500
      },
      "propertyTypes": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 100000
        },
        "maxItems": 500
      },
      "mustHaves": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 100000
        },
        "maxItems": 500
      },
      "features": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 100000
        },
        "maxItems": 500
      },
      "photoIds": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 100000
        },
        "maxItems": 500
      },
      "identityStatus": {
        "type": "string",
        "maxLength": 100000
      },
      "financingStatus": {
        "type": "string",
        "maxLength": 100000
      },
      "agreementStatus": {
        "type": "string",
        "maxLength": 100000
      },
      "completionStatus": {
        "type": "string",
        "maxLength": 100000
      },
      "contractType": {
        "type": "string",
        "maxLength": 100000
      },
      "originalContractMinor": {
        "type": "number"
      },
      "originalBudgetMinor": {
        "type": "number"
      },
      "startAt": {
        "type": "number"
      },
      "contractFinishAt": {
        "type": "number"
      },
      "forecastFinishAt": {
        "type": "number"
      },
      "estimateToCompleteMinor": {
        "type": "number"
      },
      "projectId": {
        "type": "string",
        "maxLength": 100000
      },
      "milestoneId": {
        "type": "string",
        "maxLength": 100000
      },
      "weightBps": {
        "type": "number"
      },
      "plannedStartAt": {
        "type": "number"
      },
      "plannedFinishAt": {
        "type": "number"
      },
      "actualProgressBps": {
        "type": "number"
      },
      "plannedBps": {
        "type": "number"
      },
      "actualBps": {
        "type": "number"
      },
      "workerHours": {
        "type": "number"
      },
      "asOfAt": {
        "type": "number"
      },
      "incurredAt": {
        "type": "number"
      },
      "rework": {
        "type": "boolean"
      },
      "reason": {
        "type": "string",
        "maxLength": 100000
      },
      "contractDeltaMinor": {
        "type": "number"
      },
      "budgetDeltaMinor": {
        "type": "number"
      },
      "scheduleDeltaDays": {
        "type": "number"
      },
      "supplier": {
        "type": "string",
        "maxLength": 100000
      },
      "package": {
        "type": "string",
        "maxLength": 100000
      },
      "requiredAt": {
        "type": "number"
      },
      "grossMinor": {
        "type": "number"
      },
      "retentionMinor": {
        "type": "number"
      },
      "advanceRecoveryMinor": {
        "type": "number"
      },
      "netMinor": {
        "type": "number"
      },
      "retentionReleaseAt": {
        "type": "number"
      },
      "reportDate": {
        "type": "number"
      },
      "toolboxTalks": {
        "type": "number"
      },
      "inspections": {
        "type": "number"
      },
      "recordableIncidents": {
        "type": "number"
      },
      "lostTimeIncidents": {
        "type": "number"
      },
      "lostDays": {
        "type": "number"
      },
      "severity": {
        "type": "string",
        "maxLength": 100000
      },
      "probability": {
        "type": "number"
      },
      "impact": {
        "type": "number"
      },
      "mitigation": {
        "type": "string",
        "maxLength": 100000
      },
      "costsComplete": {
        "type": "boolean"
      },
      "checklist": {
        "anyOf": [
          {
            "type": "array",
            "items": {
              "type": "string",
              "maxLength": 100000
            },
            "maxItems": 500
          },
          {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "text": {
                  "type": "string",
                  "maxLength": 100000
                },
                "done": {
                  "type": "boolean"
                }
              },
              "required": [
                "text",
                "done"
              ],
              "additionalProperties": false
            },
            "maxItems": 500
          }
        ]
      },
      "costs": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "label": {
              "type": "string",
              "maxLength": 100000
            },
            "amountMinor": {
              "type": "number"
            },
            "expenseId": {
              "type": "string",
              "maxLength": 100000
            }
          },
          "required": [
            "label",
            "amountMinor"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      },
      "milestones": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "label": {
              "type": "string",
              "maxLength": 100000
            },
            "amountMinor": {
              "type": "number"
            },
            "dueAt": {
              "type": "number"
            },
            "withheld": {
              "type": "boolean"
            },
            "orderId": {
              "type": "string",
              "maxLength": 100000
            }
          },
          "required": [
            "label",
            "amountMinor",
            "dueAt",
            "withheld"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      },
      "extras": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "label": {
              "type": "string",
              "maxLength": 100000
            },
            "amountMinor": {
              "type": "number"
            },
            "approved": {
              "type": "boolean"
            },
            "approvedBy": {
              "type": "string",
              "maxLength": 100000
            },
            "approvedAt": {
              "type": "number"
            }
          },
          "required": [
            "label",
            "amountMinor",
            "approved"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      },
      "lines": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "kind": {
              "type": "string",
              "maxLength": 100000
            },
            "name": {
              "type": "string",
              "maxLength": 100000
            },
            "variantId": {
              "type": "string",
              "maxLength": 100000
            },
            "qty": {
              "type": "number"
            },
            "unitPriceMinor": {
              "type": "number"
            },
            "standardMinutes": {
              "type": "number"
            }
          },
          "required": [
            "qty",
            "unitPriceMinor"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      },
      "vehicleId": {
        "type": "string",
        "maxLength": 100000
      },
      "serviceId": {
        "type": "string",
        "maxLength": 100000
      },
      "bayId": {
        "type": "string",
        "maxLength": 100000
      },
      "appointmentId": {
        "type": "string",
        "maxLength": 100000
      },
      "technicianAccountId": {
        "type": "string",
        "maxLength": 100000
      },
      "assignedAdvisorAccountId": {
        "type": "string",
        "maxLength": 100000
      },
      "name": {
        "type": "string",
        "maxLength": 100000
      },
      "category": {
        "type": "string",
        "maxLength": 100000
      },
      "plate": {
        "type": "string",
        "maxLength": 100000
      },
      "vin": {
        "type": "string",
        "maxLength": 100000
      },
      "make": {
        "type": "string",
        "maxLength": 100000
      },
      "model": {
        "type": "string",
        "maxLength": 100000
      },
      "year": {
        "type": "number"
      },
      "powertrain": {
        "type": "string",
        "maxLength": 100000
      },
      "odometerKm": {
        "type": "number"
      },
      "durationMinutes": {
        "type": "number"
      },
      "standardLaborMinutes": {
        "type": "number"
      },
      "priceMinor": {
        "type": "number"
      },
      "active": {
        "type": "boolean"
      },
      "preferredFrom": {
        "type": "number"
      },
      "preferredTo": {
        "type": "number"
      },
      "startsAt": {
        "type": "number"
      },
      "promisedAt": {
        "type": "number"
      },
      "concern": {
        "type": "string",
        "maxLength": 100000
      },
      "warrantyDisposition": {
        "type": "string",
        "maxLength": 100000
      },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "category": {
              "type": "string",
              "maxLength": 100000
            },
            "condition": {
              "type": "string",
              "maxLength": 100000
            },
            "note": {
              "type": "string",
              "maxLength": 100000
            },
            "photoIds": {
              "type": "array",
              "items": {
                "type": "string",
                "maxLength": 100000
              },
              "maxItems": 500
            }
          },
          "required": [
            "category",
            "condition"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "jobId": {
    "type": "string",
    "maxLength": 100000
  },
  "equipmentId": {
    "type": "string",
    "maxLength": 100000
  },
  "propertyId": {
    "type": "string",
    "maxLength": 100000
  },
  "enquiryId": {
    "type": "string",
    "maxLength": 100000
  },
  "productRequestId": {
    "type": "string",
    "maxLength": 100000
  },
  "opportunityId": {
    "type": "string",
    "maxLength": 100000
  },
  "matchId": {
    "type": "string",
    "maxLength": 100000
  },
  "viewingId": {
    "type": "string",
    "maxLength": 100000
  },
  "offerId": {
    "type": "string",
    "maxLength": 100000
  },
  "draftId": {
    "type": "string",
    "maxLength": 100000
  },
  "commissionId": {
    "type": "string",
    "maxLength": 100000
  },
  "memberId": {
    "type": "string",
    "maxLength": 100000
  },
  "email": {
    "type": "string",
    "maxLength": 100000
  },
  "operationalRole": {
    "type": "string",
    "maxLength": 100000
  },
  "commissionMinor": {
    "type": "number"
  },
  "appointmentRequestId": {
    "type": "string",
    "maxLength": 100000
  },
  "notificationId": {
    "type": "string",
    "maxLength": 100000
  },
  "waitlistOfferId": {
    "type": "string",
    "maxLength": 100000
  },
  "taskId": {
    "type": "string",
    "maxLength": 100000
  },
  "assignedAccountId": {
    "type": "string",
    "maxLength": 100000
  },
  "projectId": {
    "type": "string",
    "maxLength": 100000
  },
  "milestoneId": {
    "type": "string",
    "maxLength": 100000
  },
  "variationId": {
    "type": "string",
    "maxLength": 100000
  },
  "commitmentId": {
    "type": "string",
    "maxLength": 100000
  },
  "claimId": {
    "type": "string",
    "maxLength": 100000
  },
  "qualityId": {
    "type": "string",
    "maxLength": 100000
  },
  "riskId": {
    "type": "string",
    "maxLength": 100000
  },
  "vehicleId": {
    "type": "string",
    "maxLength": 100000
  },
  "bayId": {
    "type": "string",
    "maxLength": 100000
  },
  "appointmentId": {
    "type": "string",
    "maxLength": 100000
  },
  "workOrderId": {
    "type": "string",
    "maxLength": 100000
  },
  "estimateId": {
    "type": "string",
    "maxLength": 100000
  },
  "laborEntryId": {
    "type": "string",
    "maxLength": 100000
  },
  "partAllocationId": {
    "type": "string",
    "maxLength": 100000
  },
  "source": {
    "type": "string",
    "maxLength": 100000
  },
  "preferredFrom": {
    "type": "number"
  },
  "preferredTo": {
    "type": "number"
  },
  "firstInboundAt": {
    "type": "number"
  },
  "firstResponseSubmittedAt": {
    "type": "number"
  },
  "preferenceStatus": {
    "type": "string",
    "maxLength": 100000
  },
  "evidenceSource": {
    "type": "string",
    "maxLength": 100000
  },
  "evidenceAt": {
    "type": "number"
  },
  "notificationKind": {
    "type": "string",
    "maxLength": 100000
  },
  "idempotencyKey": {
    "type": "string",
    "maxLength": 100000
  },
  "templateId": {
    "type": "string",
    "maxLength": 100000
  },
  "outsideServiceWindow": {
    "type": "boolean"
  },
  "rating": {
    "type": "number"
  },
  "experienceReason": {
    "type": "string",
    "maxLength": 100000
  },
  "weekStart": {
    "type": "string",
    "maxLength": 100000
  },
  "governance": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "maxLength": 100000
      },
      "jurisdiction": {
        "type": "string",
        "maxLength": 100000
      },
      "permitStatus": {
        "type": "string",
        "maxLength": 100000
      },
      "controller": {
        "type": "string",
        "maxLength": 100000
      },
      "processor": {
        "type": "string",
        "maxLength": 100000
      },
      "approvedRegions": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 100000
        },
        "maxItems": 500
      },
      "subprocessors": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 100000
        },
        "maxItems": 500
      },
      "retentionDays": {
        "type": "number"
      },
      "backupRetentionDays": {
        "type": "number"
      },
      "supportAccess": {
        "type": "string",
        "maxLength": 100000
      },
      "incidentOwner": {
        "type": "string",
        "maxLength": 100000
      },
      "rightsOwner": {
        "type": "string",
        "maxLength": 100000
      },
      "crossBorderStatus": {
        "type": "string",
        "maxLength": 100000
      }
    },
    "required": [
      "status",
      "jurisdiction",
      "permitStatus",
      "controller",
      "processor",
      "approvedRegions",
      "subprocessors",
      "retentionDays",
      "backupRetentionDays",
      "supportAccess",
      "incidentOwner",
      "rightsOwner",
      "crossBorderStatus"
    ],
    "additionalProperties": false
  },
  "requestId": {
    "type": "string",
    "maxLength": 100000
  },
  "cursor": {
    "type": "string",
    "maxLength": 100000
  },
  "limit": {
    "type": "number"
  },
  "search": {
    "type": "string",
    "maxLength": 100000
  },
  "status": {
    "type": "string",
    "maxLength": 100000
  },
  "itemId": {
    "type": "string",
    "maxLength": 100000
  },
  "variantId": {
    "type": "string",
    "maxLength": 100000
  },
  "orderId": {
    "type": "string",
    "maxLength": 100000
  },
  "contactId": {
    "type": "string",
    "maxLength": 100000
  },
  "conversationId": {
    "type": "string",
    "maxLength": 100000
  },
  "item": {
    "type": "object",
    "properties": {
      "kind": {
        "type": "string",
        "maxLength": 100000
      },
      "nameAr": {
        "type": "string",
        "maxLength": 100000
      },
      "nameEn": {
        "type": "string",
        "maxLength": 100000
      },
      "category": {
        "type": "string",
        "maxLength": 100000
      },
      "unit": {
        "type": "string",
        "maxLength": 100000
      },
      "trackStock": {
        "type": "boolean"
      },
      "catalogEntryKey": {
        "type": "string",
        "maxLength": 100000
      },
      "serialized": {
        "type": "boolean"
      },
      "warrantyMonths": {
        "type": "number"
      },
      "warrantyBy": {
        "type": "string",
        "maxLength": 100000
      },
      "photoId": {
        "type": "string",
        "maxLength": 100000
      }
    },
    "required": [
      "kind",
      "nameAr",
      "nameEn",
      "category",
      "unit",
      "trackStock"
    ],
    "additionalProperties": false
  },
  "variants": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "variantId": {
          "type": "string",
          "maxLength": 100000
        },
        "sku": {
          "type": "string",
          "maxLength": 100000
        },
        "options": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "key": {
                "type": "string",
                "maxLength": 100000
              },
              "value": {
                "type": "string",
                "maxLength": 100000
              }
            },
            "required": [
              "key",
              "value"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        },
        "priceMinor": {
          "type": "number"
        },
        "costMinor": {
          "type": "number"
        },
        "reorderPoint": {
          "type": "number"
        },
        "openingStock": {
          "type": "number"
        }
      },
      "required": [
        "sku",
        "options",
        "priceMinor"
      ],
      "additionalProperties": false
    },
    "maxItems": 500
  },
  "delta": {
    "type": "number"
  },
  "reason": {
    "type": "string",
    "maxLength": 100000
  },
  "unitCostMinor": {
    "type": "number"
  },
  "note": {
    "type": "string",
    "maxLength": 100000
  },
  "channel": {
    "type": "string",
    "maxLength": 100000
  },
  "lines": {
    "anyOf": [
      {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "variantId": {
              "type": "string",
              "maxLength": 100000
            },
            "name": {
              "type": "string",
              "maxLength": 100000
            },
            "qty": {
              "type": "number"
            },
            "unitPriceMinor": {
              "type": "number"
            },
            "discountMinor": {
              "type": "number"
            },
            "serials": {
              "type": "array",
              "items": {
                "type": "string",
                "maxLength": 100000
              },
              "maxItems": 500
            },
            "modifierKeys": {
              "type": "array",
              "items": {
                "type": "string",
                "maxLength": 100000
              },
              "maxItems": 500
            }
          },
          "required": [
            "qty"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      },
      {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "variantId": {
              "type": "string",
              "maxLength": 100000
            },
            "qty": {
              "type": "number"
            },
            "unitCostMinor": {
              "type": "number"
            },
            "useBy": {
              "type": "string",
              "maxLength": 100000
            }
          },
          "required": [
            "variantId",
            "qty",
            "unitCostMinor"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      }
    ]
  },
  "deliveryFeeMinor": {
    "type": "number"
  },
  "confirm": {
    "type": "boolean"
  },
  "fulfilment": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "maxLength": 100000
      },
      "area": {
        "type": "string",
        "maxLength": 100000
      },
      "dueAt": {
        "type": "number"
      }
    },
    "required": [
      "type"
    ],
    "additionalProperties": false
  },
  "customFields": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "key": {
          "type": "string",
          "maxLength": 100000
        },
        "value": {
          "type": "string",
          "maxLength": 100000
        }
      },
      "required": [
        "key",
        "value"
      ],
      "additionalProperties": false
    },
    "maxItems": 500
  },
  "notes": {
    "type": "string",
    "maxLength": 100000
  },
  "customerName": {
    "type": "string",
    "maxLength": 100000
  },
  "to": {
    "type": "string",
    "maxLength": 100000
  },
  "version": {
    "type": "number"
  },
  "amountMinor": {
    "type": "number"
  },
  "method": {
    "type": "string",
    "maxLength": 100000
  },
  "reference": {
    "type": "string",
    "maxLength": 100000
  },
  "vat": {
    "type": "object",
    "properties": {
      "registered": {
        "type": "boolean"
      },
      "rateBps": {
        "type": "number"
      },
      "pricesIncludeVat": {
        "type": "boolean"
      },
      "vatin": {
        "type": "string",
        "maxLength": 100000
      }
    },
    "required": [
      "registered",
      "rateBps",
      "pricesIncludeVat"
    ],
    "additionalProperties": false
  },
  "unsoldDays": {
    "type": "number"
  },
  "absenceDays": {
    "type": "number"
  },
  "listingFreshnessDays": {
    "type": "number"
  },
  "constructionIncidentHoursDenominator": {
    "type": "number"
  },
  "realEstate": {
    "type": "object",
    "properties": {
      "viewingWindowDays": {
        "type": "number"
      },
      "closeWindowDaysRent": {
        "type": "number"
      },
      "closeWindowDaysSale": {
        "type": "number"
      },
      "lateCancelHours": {
        "type": "number"
      },
      "responseSlaMinutes": {
        "type": "number"
      },
      "commissionTermsDays": {
        "type": "number"
      },
      "rules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "maxLength": 100000
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string",
              "maxLength": 100000
            },
            "offsetMinutes": {
              "type": "number"
            }
          },
          "required": [
            "id",
            "enabled",
            "mode",
            "offsetMinutes"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "media": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "maxLength": 100000
      },
      "productionType": {
        "type": "string",
        "maxLength": 100000
      },
      "purpose": {
        "type": "string",
        "maxLength": 100000
      },
      "budgetMinor": {
        "type": "number"
      },
      "dateNeeded": {
        "type": "string",
        "maxLength": 100000
      },
      "deliverables": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "format": {
              "type": "string",
              "maxLength": 100000
            },
            "aspectRatio": {
              "type": "string",
              "maxLength": 100000
            },
            "durationSeconds": {
              "type": "number"
            },
            "quantity": {
              "type": "number"
            },
            "language": {
              "type": "string",
              "maxLength": 100000
            }
          },
          "required": [
            "format",
            "quantity"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      },
      "shootStartsAt": {
        "type": "number"
      },
      "shootEndsAt": {
        "type": "number"
      },
      "location": {
        "type": "string",
        "maxLength": 100000
      },
      "deliveryDueAt": {
        "type": "number"
      },
      "firstCutDueAt": {
        "type": "number"
      },
      "producerId": {
        "type": "string",
        "maxLength": 100000
      },
      "revisionAllowance": {
        "type": "number"
      },
      "usageRights": {
        "type": "object",
        "properties": {
          "territory": {
            "type": "string",
            "maxLength": 100000
          },
          "channels": {
            "type": "array",
            "items": {
              "type": "string",
              "maxLength": 100000
            },
            "maxItems": 500
          },
          "termEndsAt": {
            "type": "number"
          },
          "clearance": {
            "type": "string",
            "maxLength": 100000
          }
        },
        "required": [],
        "additionalProperties": false
      },
      "nextAction": {
        "type": "string",
        "maxLength": 100000
      },
      "contactId": {
        "type": "string",
        "maxLength": 100000
      },
      "conversationId": {
        "type": "string",
        "maxLength": 100000
      },
      "source": {
        "type": "string",
        "maxLength": 100000
      },
      "quoteMinor": {
        "type": "number"
      },
      "depositMinor": {
        "type": "number"
      },
      "quoteVersion": {
        "type": "number"
      },
      "acceptedBy": {
        "type": "string",
        "maxLength": 100000
      },
      "evidenceSource": {
        "type": "string",
        "maxLength": 100000
      },
      "key": {
        "type": "string",
        "maxLength": 100000
      },
      "verified": {
        "type": "boolean"
      },
      "note": {
        "type": "string",
        "maxLength": 100000
      },
      "mediaReceived": {
        "type": "boolean"
      },
      "label": {
        "type": "string",
        "maxLength": 100000
      },
      "assetRef": {
        "type": "string",
        "maxLength": 100000
      },
      "approverName": {
        "type": "string",
        "maxLength": 100000
      },
      "decisionDueAt": {
        "type": "number"
      },
      "decision": {
        "type": "string",
        "maxLength": 100000
      },
      "feedback": {
        "type": "string",
        "maxLength": 100000
      },
      "kind": {
        "type": "string",
        "maxLength": 100000
      },
      "description": {
        "type": "string",
        "maxLength": 100000
      },
      "priceMinor": {
        "type": "number"
      },
      "deliverable": {
        "type": "object",
        "properties": {
          "format": {
            "type": "string",
            "maxLength": 100000
          },
          "aspectRatio": {
            "type": "string",
            "maxLength": 100000
          },
          "durationSeconds": {
            "type": "number"
          },
          "quantity": {
            "type": "number"
          },
          "language": {
            "type": "string",
            "maxLength": 100000
          }
        },
        "required": [
          "format",
          "quantity"
        ],
        "additionalProperties": false
      },
      "customerApproval": {
        "type": "string",
        "maxLength": 100000
      },
      "name": {
        "type": "string",
        "maxLength": 100000
      },
      "category": {
        "type": "string",
        "maxLength": 100000
      },
      "active": {
        "type": "boolean"
      },
      "internalRateMinor": {
        "type": "number"
      },
      "startsAt": {
        "type": "number"
      },
      "endsAt": {
        "type": "number"
      },
      "amountMinor": {
        "type": "number"
      },
      "hours": {
        "type": "number"
      },
      "expenseId": {
        "type": "string",
        "maxLength": 100000
      },
      "changeOrderId": {
        "type": "string",
        "maxLength": 100000
      },
      "extraScope": {
        "type": "boolean"
      },
      "costKind": {
        "type": "string",
        "maxLength": 100000
      },
      "incurredAt": {
        "type": "number"
      },
      "link": {
        "type": "string",
        "maxLength": 100000
      },
      "final": {
        "type": "boolean"
      },
      "text": {
        "type": "string",
        "maxLength": 100000
      },
      "templateId": {
        "type": "string",
        "maxLength": 100000
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "productionId": {
    "type": "string",
    "maxLength": 100000
  },
  "cutId": {
    "type": "string",
    "maxLength": 100000
  },
  "changeOrderId": {
    "type": "string",
    "maxLength": 100000
  },
  "mediaResourceId": {
    "type": "string",
    "maxLength": 100000
  },
  "reservationId": {
    "type": "string",
    "maxLength": 100000
  },
  "costId": {
    "type": "string",
    "maxLength": 100000
  },
  "mediaSettings": {
    "type": "object",
    "properties": {
      "quoteWindowDays": {
        "type": "number"
      },
      "revisionWindowDays": {
        "type": "number"
      },
      "prepCutoffHours": {
        "type": "number"
      },
      "reviewResponseHours": {
        "type": "number"
      },
      "revisionAllowance": {
        "type": "number"
      },
      "depositPercent": {
        "type": "number"
      },
      "extraRoundPriceMinor": {
        "type": "number"
      },
      "autoQuoteLimitMinor": {
        "type": "number"
      },
      "resourceHoursPerDay": {
        "type": "number"
      },
      "holdHours": {
        "type": "number"
      },
      "rules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "maxLength": 100000
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string",
              "maxLength": 100000
            },
            "offsetMinutes": {
              "type": "number"
            }
          },
          "required": [
            "id",
            "enabled",
            "mode",
            "offsetMinutes"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "fitness": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 100000
      },
      "kind": {
        "type": "string",
        "maxLength": 100000
      },
      "termDays": {
        "type": "number"
      },
      "billingMonths": {
        "type": "number"
      },
      "priceMinor": {
        "type": "number"
      },
      "credits": {
        "type": "number"
      },
      "freezeMaxDays": {
        "type": "number"
      },
      "graceDays": {
        "type": "number"
      },
      "active": {
        "type": "boolean"
      },
      "title": {
        "type": "string",
        "maxLength": 100000
      },
      "classType": {
        "type": "string",
        "maxLength": 100000
      },
      "startsAt": {
        "type": "number"
      },
      "endsAt": {
        "type": "number"
      },
      "capacity": {
        "type": "number"
      },
      "coachId": {
        "type": "string",
        "maxLength": 100000
      },
      "coachName": {
        "type": "string",
        "maxLength": 100000
      },
      "cancel": {
        "type": "boolean"
      },
      "trial": {
        "type": "boolean"
      },
      "source": {
        "type": "string",
        "maxLength": 100000
      },
      "sourceEventId": {
        "type": "string",
        "maxLength": 100000
      },
      "assignedAccountId": {
        "type": "string",
        "maxLength": 100000
      },
      "days": {
        "type": "number"
      },
      "end": {
        "type": "boolean"
      },
      "text": {
        "type": "string",
        "maxLength": 100000
      },
      "templateId": {
        "type": "string",
        "maxLength": 100000
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "planId": {
    "type": "string",
    "maxLength": 100000
  },
  "classId": {
    "type": "string",
    "maxLength": 100000
  },
  "seatId": {
    "type": "string",
    "maxLength": 100000
  },
  "dental": {
    "type": "object",
    "properties": {
      "resourceId": {
        "type": "string",
        "maxLength": 100000
      },
      "kind": {
        "type": "string",
        "maxLength": 100000
      },
      "name": {
        "type": "string",
        "maxLength": 100000
      },
      "active": {
        "type": "boolean"
      },
      "providerId": {
        "type": "string",
        "maxLength": 100000
      },
      "chairId": {
        "type": "string",
        "maxLength": 100000
      },
      "serviceItemId": {
        "type": "string",
        "maxLength": 100000
      },
      "startsAt": {
        "type": "number"
      },
      "durationMinutes": {
        "type": "number"
      },
      "forMinor": {
        "type": "boolean"
      },
      "guardianContactId": {
        "type": "string",
        "maxLength": 100000
      },
      "source": {
        "type": "string",
        "maxLength": 100000
      },
      "replacementForId": {
        "type": "string",
        "maxLength": 100000
      },
      "recallDueAt": {
        "type": "number"
      },
      "clearRecall": {
        "type": "boolean"
      },
      "disputed": {
        "type": "boolean"
      },
      "text": {
        "type": "string",
        "maxLength": 100000
      },
      "templateId": {
        "type": "string",
        "maxLength": 100000
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "visitId": {
    "type": "string",
    "maxLength": 100000
  },
  "dentalSettings": {
    "type": "object",
    "properties": {
      "visitMinutes": {
        "type": "number"
      },
      "lateCancelHours": {
        "type": "number"
      },
      "balanceDueDays": {
        "type": "number"
      },
      "recallWindowDays": {
        "type": "number"
      },
      "chairDayMinutes": {
        "type": "number"
      },
      "openDaysPerWeek": {
        "type": "number"
      },
      "rules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "maxLength": 100000
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string",
              "maxLength": 100000
            },
            "offsetMinutes": {
              "type": "number"
            }
          },
          "required": [
            "id",
            "enabled",
            "mode",
            "offsetMinutes"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "fitnessSettings": {
    "type": "object",
    "properties": {
      "conversionWindowDays": {
        "type": "number"
      },
      "gapDays": {
        "type": "number"
      },
      "minObservationDays": {
        "type": "number"
      },
      "renewalNoticeDays": {
        "type": "number"
      },
      "rules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "maxLength": 100000
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string",
              "maxLength": 100000
            },
            "offsetMinutes": {
              "type": "number"
            }
          },
          "required": [
            "id",
            "enabled",
            "mode",
            "offsetMinutes"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "metric": {
    "type": "string",
    "maxLength": 100000
  },
  "segment": {
    "type": "string",
    "maxLength": 100000
  },
  "filter": {
    "type": "string",
    "maxLength": 100000
  },
  "channelCostMinor": {
    "type": "number"
  },
  "adiba": {
    "type": "object",
    "properties": {
      "lines": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "key": {
              "type": "string",
              "maxLength": 100000
            },
            "unitPriceMinor": {
              "type": "number"
            },
            "qty": {
              "type": "number"
            },
            "name": {
              "type": "string",
              "maxLength": 100000
            }
          },
          "required": [
            "key"
          ],
          "additionalProperties": false
        },
        "maxItems": 500
      },
      "text": {
        "type": "string",
        "maxLength": 100000
      },
      "depositMinor": {
        "type": "number"
      },
      "validUntil": {
        "type": "number"
      },
      "acceptedBy": {
        "type": "string",
        "maxLength": 100000
      },
      "evidenceSource": {
        "type": "string",
        "maxLength": 100000
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "stockPolicy": {
    "type": "string",
    "maxLength": 100000
  },
  "products": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "requestId": {
          "type": "string",
          "maxLength": 100000
        },
        "item": {
          "type": "object",
          "properties": {
            "kind": {
              "type": "string",
              "maxLength": 100000
            },
            "nameAr": {
              "type": "string",
              "maxLength": 100000
            },
            "nameEn": {
              "type": "string",
              "maxLength": 100000
            },
            "category": {
              "type": "string",
              "maxLength": 100000
            },
            "unit": {
              "type": "string",
              "maxLength": 100000
            },
            "trackStock": {
              "type": "boolean"
            },
            "catalogEntryKey": {
              "type": "string",
              "maxLength": 100000
            },
            "serialized": {
              "type": "boolean"
            },
            "warrantyMonths": {
              "type": "number"
            },
            "warrantyBy": {
              "type": "string",
              "maxLength": 100000
            },
            "photoId": {
              "type": "string",
              "maxLength": 100000
            }
          },
          "required": [
            "kind",
            "nameAr",
            "nameEn",
            "category",
            "unit",
            "trackStock"
          ],
          "additionalProperties": false
        },
        "variants": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "sku": {
                "type": "string",
                "maxLength": 100000
              },
              "options": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "key": {
                      "type": "string",
                      "maxLength": 100000
                    },
                    "value": {
                      "type": "string",
                      "maxLength": 100000
                    }
                  },
                  "required": [
                    "key",
                    "value"
                  ],
                  "additionalProperties": false
                },
                "maxItems": 500
              },
              "priceMinor": {
                "type": "number"
              },
              "costMinor": {
                "type": "number"
              },
              "reorderPoint": {
                "type": "number"
              },
              "quantity": {
                "type": "number"
              },
              "serials": {
                "type": "array",
                "items": {
                  "type": "string",
                  "maxLength": 100000
                },
                "maxItems": 500
              }
            },
            "required": [
              "sku",
              "options",
              "priceMinor"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        }
      },
      "required": [
        "requestId",
        "item",
        "variants"
      ],
      "additionalProperties": false
    },
    "maxItems": 500
  },
  "storageId": {
    "type": "string",
    "maxLength": 100000
  },
  "photoId": {
    "type": "string",
    "maxLength": 100000
  },
  "lineSerials": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "variantId": {
          "type": "string",
          "maxLength": 100000
        },
        "serials": {
          "type": "array",
          "items": {
            "type": "string",
            "maxLength": 100000
          },
          "maxItems": 500
        }
      },
      "required": [
        "variantId",
        "serials"
      ],
      "additionalProperties": false
    },
    "maxItems": 500
  },
  "serials": {
    "type": "array",
    "items": {
      "type": "string",
      "maxLength": 100000
    },
    "maxItems": 500
  },
  "serial": {
    "type": "string",
    "maxLength": 100000
  },
  "costMinor": {
    "type": "number"
  },
  "repairId": {
    "type": "string",
    "maxLength": 100000
  },
  "device": {
    "type": "string",
    "maxLength": 100000
  },
  "fault": {
    "type": "string",
    "maxLength": 100000
  },
  "accessories": {
    "type": "string",
    "maxLength": 100000
  },
  "quoteMinor": {
    "type": "number"
  },
  "labourMinor": {
    "type": "number"
  },
  "parts": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "variantId": {
          "type": "string",
          "maxLength": 100000
        },
        "qty": {
          "type": "number"
        },
        "unitPriceMinor": {
          "type": "number"
        }
      },
      "required": [
        "variantId",
        "qty"
      ],
      "additionalProperties": false
    },
    "maxItems": 500
  },
  "dueAt": {
    "type": "number"
  },
  "modifiers": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "key": {
          "type": "string",
          "maxLength": 100000
        },
        "label": {
          "type": "string",
          "maxLength": 100000
        },
        "priceMinor": {
          "type": "number"
        },
        "ingredients": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "variantId": {
                "type": "string",
                "maxLength": 100000
              },
              "qty": {
                "type": "number"
              },
              "unit": {
                "type": "string",
                "maxLength": 100000
              }
            },
            "required": [
              "variantId",
              "qty",
              "unit"
            ],
            "additionalProperties": false
          },
          "maxItems": 500
        }
      },
      "required": [
        "key",
        "label",
        "priceMinor",
        "ingredients"
      ],
      "additionalProperties": false
    },
    "maxItems": 500
  },
  "menuVariantId": {
    "type": "string",
    "maxLength": 100000
  },
  "yieldQty": {
    "type": "number"
  },
  "ingredients": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "variantId": {
          "type": "string",
          "maxLength": 100000
        },
        "qty": {
          "type": "number"
        },
        "unit": {
          "type": "string",
          "maxLength": 100000
        }
      },
      "required": [
        "variantId",
        "qty",
        "unit"
      ],
      "additionalProperties": false
    },
    "maxItems": 500
  },
  "qty": {
    "type": "number"
  },
  "countedQty": {
    "type": "number"
  },
  "invoiceNumber": {
    "type": "string",
    "maxLength": 100000
  },
  "receivedOn": {
    "type": "string",
    "maxLength": 100000
  },
  "outputVariantId": {
    "type": "string",
    "maxLength": 100000
  },
  "outputQty": {
    "type": "number"
  },
  "inputs": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "variantId": {
          "type": "string",
          "maxLength": 100000
        },
        "qty": {
          "type": "number"
        },
        "unit": {
          "type": "string",
          "maxLength": 100000
        }
      },
      "required": [
        "variantId",
        "qty"
      ],
      "additionalProperties": false
    },
    "maxItems": 500
  },
  "producedOn": {
    "type": "string",
    "maxLength": 100000
  },
  "useBy": {
    "type": "string",
    "maxLength": 100000
  },
  "days": {
    "type": "number"
  },
  "disposition": {
    "type": "string",
    "maxLength": 100000
  },
  "expenseId": {
    "type": "string",
    "maxLength": 100000
  },
  "category": {
    "type": "string",
    "maxLength": 100000
  },
  "vatMinor": {
    "type": "number"
  },
  "vendor": {
    "type": "string",
    "maxLength": 100000
  },
  "paidOn": {
    "type": "string",
    "maxLength": 100000
  },
  "period": {
    "type": "string",
    "maxLength": 100000
  }
};
export const HASIB_FIELDS_BY_OPERATION = {
  "adiba_offer": [
    "version",
    "offerId",
    "status",
    "contactId",
    "conversationId",
    "adiba"
  ],
  "adiba_offer_accept_record": [
    "version",
    "offerId",
    "status",
    "contactId",
    "conversationId",
    "adiba"
  ],
  "adiba_offer_approve": [
    "version",
    "offerId",
    "status",
    "contactId",
    "conversationId",
    "adiba"
  ],
  "adiba_offer_price": [
    "version",
    "offerId",
    "status",
    "contactId",
    "conversationId",
    "adiba"
  ],
  "adiba_offer_withdraw": [
    "version",
    "offerId",
    "status",
    "contactId",
    "conversationId",
    "adiba"
  ],
  "adiba_offers": [
    "version",
    "offerId",
    "status",
    "contactId",
    "conversationId",
    "adiba"
  ],
  "automotive_appointment_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_appointment_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_appointments": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_approval_record": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_bay_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_bays": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_contacts": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_estimate_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_estimate_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_estimates": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_experience_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_insights": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_inspection_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_labor_entries": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_labor_start": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_labor_stop": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_overview": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_part_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_part_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_parts": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_quality_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_request_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_request_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_requests": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_service_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_services": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_vehicle_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_vehicles": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_work_order": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_work_order_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_work_order_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "automotive_work_orders": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "reason",
    "vehicleId",
    "bayId",
    "serviceId",
    "appointmentRequestId",
    "appointmentId",
    "workOrderId",
    "estimateId",
    "laborEntryId",
    "partAllocationId",
    "assignedAccountId",
    "firstResponseSubmittedAt",
    "evidenceSource",
    "approvedBy",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "baking_suggestions": [],
  "batch_create": [
    "requestId",
    "outputVariantId",
    "outputQty",
    "inputs",
    "note",
    "producedOn",
    "useBy"
  ],
  "booking_create": [
    "requestId",
    "serviceId",
    "resourceIds",
    "contactId",
    "startsAt",
    "orderId",
    "membershipId",
    "replacementForId"
  ],
  "booking_status": [
    "requestId",
    "bookingId",
    "version",
    "to",
    "reason"
  ],
  "booking_update": [
    "requestId",
    "bookingId",
    "version",
    "startsAt",
    "resourceIds"
  ],
  "bookings": [
    "status",
    "contactId",
    "fromAt",
    "toAt",
    "cursor",
    "limit"
  ],
  "clinic_experience_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_governance": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_governance_update": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_insights": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_metric_snapshot": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_notification_queue": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_notification_resolve": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_notification_retry": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_notifications": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_overview": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_patient_summary": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_preference_update": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_preferences": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_request_assign": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_request_book": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_request_decline": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_request_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_request_withdraw": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_requests": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_task_resolve": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_tasks": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_waitlist_cancel": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_waitlist_expire": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "clinic_waitlist_offer": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "contactId",
    "conversationId",
    "serviceId",
    "bookingId",
    "appointmentRequestId",
    "notificationId",
    "waitlistId",
    "waitlistOfferId",
    "taskId",
    "assignedAccountId",
    "source",
    "channel",
    "reason",
    "preferredFrom",
    "preferredTo",
    "firstInboundAt",
    "startsAt",
    "fromAt",
    "toAt",
    "preferenceStatus",
    "evidenceSource",
    "evidenceAt",
    "notificationKind",
    "idempotencyKey",
    "templateId",
    "outsideServiceWindow",
    "rating",
    "experienceReason",
    "weekStart",
    "governance"
  ],
  "commission_record": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "commissions": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "compliance": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "compliance_update": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "construction_baseline_approve": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_claim_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_claim_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_claims": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_commitment_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_commitment_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_commitments": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_cost_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_costs": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_experience_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_insights": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_milestone_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_milestones": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_overview": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_progress": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_progress_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_project": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_project_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_project_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_projects": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_quality": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_quality_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_quality_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_retention_release": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_risk_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_risk_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_risks": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_site_report_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_site_reports": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_task_resolve": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_tasks": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_variation_save": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_variation_status": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "construction_variations": [
    "requestId",
    "version",
    "cursor",
    "limit",
    "status",
    "projectId",
    "milestoneId",
    "variationId",
    "commitmentId",
    "claimId",
    "qualityId",
    "riskId",
    "taskId",
    "expenseId",
    "rating",
    "experienceReason",
    "workflow"
  ],
  "contact_summary": [
    "contactId"
  ],
  "conversation_orders": [
    "conversationId"
  ],
  "deal_close": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "deal_history": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "dental_charge": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_charge_dispute": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_context": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_draft_approve": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_followups": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_insights": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_metric_records": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_overview": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_payment_record": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_recall_set": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_resource_save": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_resources": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_task_resolve": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_task_snooze": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_visit": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_visit_book": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_visit_reschedule": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_visit_status": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "dental_visits": [
    "requestId",
    "version",
    "visitId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "lines",
    "dental"
  ],
  "draft_approve": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "draft_save": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "drafts": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "equipment": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "equipment_save": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "expense_create": [
    "requestId",
    "category",
    "amountMinor",
    "vatMinor",
    "vendor",
    "method",
    "paidOn",
    "note"
  ],
  "expense_void": [
    "expenseId"
  ],
  "expenses": [
    "period"
  ],
  "fitness_cancel": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_checkin": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_class_save": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_classes": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_context": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_draft_approve": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_followups": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_freeze": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_insights": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_member": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_members": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_membership_save": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_metric_records": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_overview": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_payment_record": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_plan_save": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_plans": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_renew": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_seat_book": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_seat_status": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_task_resolve": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "fitness_task_snooze": [
    "requestId",
    "version",
    "planId",
    "classId",
    "seatId",
    "membershipId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "fitness"
  ],
  "followup_complete": [
    "requestId",
    "followupId",
    "version"
  ],
  "followup_save": [
    "requestId",
    "followupId",
    "version",
    "contactId",
    "dueAt",
    "reason",
    "conversationId",
    "linkedType",
    "linkedId"
  ],
  "followups": [
    "status",
    "cursor",
    "limit"
  ],
  "insights": [
    "period"
  ],
  "item_archive": [
    "itemId"
  ],
  "item_photo": [
    "itemId",
    "photoId"
  ],
  "item_save": [
    "requestId",
    "itemId",
    "item",
    "variants"
  ],
  "items": [
    "search",
    "cursor",
    "limit",
    "kind"
  ],
  "items_import": [
    "products"
  ],
  "job": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "job_approve": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "job_create": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "job_estimate": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "job_repeat": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "job_status": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "job_update": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "jobs": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "low_stock": [],
  "match_generate": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "match_update": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "matches": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "media_accept": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_calendar": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_change_order_decide": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_change_order_save": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_context": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_cost_save": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_cost_void": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_costs_final": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_cut_decide": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_cut_submit": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_draft_approve": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_draft_save": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_followups": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_handoff": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_insights": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_metric_records": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_overview": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_payment_record": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_prep_verify": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_production": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_production_save": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_production_status": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_productions": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_quote": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_reservation_save": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_reservation_status": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_resource_save": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_resources": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_shoot_complete": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_task_resolve": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "media_task_snooze": [
    "requestId",
    "version",
    "productionId",
    "cutId",
    "changeOrderId",
    "mediaResourceId",
    "reservationId",
    "costId",
    "draftId",
    "taskId",
    "contactId",
    "conversationId",
    "status",
    "reason",
    "amountMinor",
    "method",
    "reference",
    "dueAt",
    "fromAt",
    "toAt",
    "metric",
    "segment",
    "period",
    "filter",
    "media"
  ],
  "membership_attendance": [
    "requestId",
    "membershipId",
    "attendedAt"
  ],
  "membership_create": [
    "requestId",
    "contactId",
    "guardianId",
    "kind",
    "name",
    "startsAt",
    "endsAt",
    "credits",
    "orderId"
  ],
  "membership_credit_reverse": [
    "requestId",
    "creditId",
    "version"
  ],
  "membership_credits": [
    "membershipId",
    "cursor",
    "limit"
  ],
  "membership_update": [
    "requestId",
    "membershipId",
    "version",
    "endsAt",
    "status"
  ],
  "memberships": [
    "contactId",
    "absenceDays",
    "cursor",
    "limit"
  ],
  "offer_approve": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "offer_save": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "offers": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "opportunities": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "opportunity_save": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "opportunity_stage": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "order": [
    "orderId"
  ],
  "order_create": [
    "requestId",
    "channel",
    "confirm",
    "contactId",
    "conversationId",
    "customerName",
    "lines",
    "deliveryFeeMinor",
    "channelCostMinor",
    "notes",
    "fulfilment",
    "customFields"
  ],
  "order_preparation": [
    "orderId",
    "version",
    "checklist"
  ],
  "order_status": [
    "orderId",
    "to",
    "version",
    "disposition",
    "lineSerials"
  ],
  "orders": [
    "status",
    "cursor",
    "limit"
  ],
  "overview": [],
  "payment_record": [
    "requestId",
    "orderId",
    "amountMinor",
    "method",
    "reference"
  ],
  "photo_register": [
    "storageId"
  ],
  "photo_upload_url": [],
  "product_request_create": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "product_request_status": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "product_requests": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "properties": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "property_save": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "property_verify": [
    "requestId",
    "version",
    "jobId",
    "equipmentId",
    "propertyId",
    "enquiryId",
    "productRequestId",
    "variantId",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "real_estate_context": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "real_estate_followups": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "real_estate_insights": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "real_estate_metric_records": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "real_estate_overview": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "real_estate_task_resolve": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "real_estate_task_snooze": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "real_estate_tasks": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "recipe_save": [
    "version",
    "modifiers",
    "menuVariantId",
    "yieldQty",
    "ingredients"
  ],
  "recipes": [
    "limit"
  ],
  "repair": [
    "repairId"
  ],
  "repair_approval": [
    "repairId",
    "version",
    "approvedBy"
  ],
  "repair_create": [
    "requestId",
    "device",
    "serial",
    "fault",
    "accessories",
    "contactId",
    "conversationId",
    "customerName",
    "quoteMinor",
    "dueAt"
  ],
  "repair_status": [
    "repairId",
    "to",
    "version"
  ],
  "repair_update": [
    "repairId",
    "version",
    "labourMinor",
    "fault",
    "parts"
  ],
  "repairs": [
    "status",
    "cursor",
    "limit"
  ],
  "resource_save": [
    "requestId",
    "resourceId",
    "version",
    "name",
    "kind",
    "capacity",
    "availability"
  ],
  "resources": [
    "cursor",
    "limit"
  ],
  "restaurant_summary": [
    "period"
  ],
  "serial_lookup": [
    "serial"
  ],
  "serials": [
    "variantId",
    "status"
  ],
  "service_save": [
    "requestId",
    "serviceId",
    "version",
    "name",
    "durationMinutes",
    "resourceIds"
  ],
  "services": [
    "cursor",
    "limit"
  ],
  "services_sync": [],
  "settings_update": [
    "unsoldDays",
    "absenceDays",
    "listingFreshnessDays",
    "constructionIncidentHoursDenominator",
    "stockPolicy",
    "realEstate",
    "vat",
    "mediaSettings",
    "fitnessSettings",
    "dentalSettings"
  ],
  "stock_count": [
    "requestId",
    "variantId",
    "countedQty",
    "note"
  ],
  "stock_expiry": [
    "days"
  ],
  "stock_move": [
    "requestId",
    "variantId",
    "delta",
    "reason",
    "unitCostMinor",
    "note",
    "serials"
  ],
  "stock_moves": [
    "variantId",
    "cursor",
    "limit"
  ],
  "stock_receive": [
    "requestId",
    "vendor",
    "invoiceNumber",
    "receivedOn",
    "lines"
  ],
  "team_invite": [
    "memberId",
    "email",
    "operationalRole"
  ],
  "team_list": [
    "memberId",
    "email",
    "operationalRole"
  ],
  "team_resend": [
    "memberId",
    "email",
    "operationalRole"
  ],
  "team_revoke": [
    "memberId",
    "email",
    "operationalRole"
  ],
  "today": [],
  "trade_in": [
    "requestId",
    "variantId",
    "serial",
    "costMinor",
    "method",
    "contactId",
    "customerName",
    "note"
  ],
  "viewing_save": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "viewings": [
    "requestId",
    "version",
    "opportunityId",
    "matchId",
    "viewingId",
    "offerId",
    "draftId",
    "commissionId",
    "taskId",
    "propertyId",
    "kind",
    "reason",
    "memberId",
    "contactId",
    "conversationId",
    "dueAt",
    "metric",
    "segment",
    "period",
    "filter",
    "email",
    "commissionMinor",
    "status",
    "cursor",
    "limit",
    "workflow"
  ],
  "waitlist": [
    "status",
    "cursor",
    "limit"
  ],
  "waitlist_add": [
    "requestId",
    "serviceId",
    "contactId",
    "earliestAt",
    "latestAt"
  ],
  "waitlist_book": [
    "requestId",
    "waitlistId",
    "version",
    "startsAt",
    "resourceIds"
  ],
  "waste_create": [
    "requestId",
    "variantId",
    "qty",
    "reason",
    "note"
  ]
};
