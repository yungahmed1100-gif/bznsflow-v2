// Generated from the existing Hasib validators. Run npm run gen:mcp.
export const HASIB_FIELDS = {
  "resourceId": {
    "type": "string"
  },
  "resourceIds": {
    "type": "array",
    "items": {
      "type": "string"
    }
  },
  "serviceId": {
    "type": "string"
  },
  "bookingId": {
    "type": "string"
  },
  "waitlistId": {
    "type": "string"
  },
  "membershipId": {
    "type": "string"
  },
  "guardianId": {
    "type": "string"
  },
  "creditId": {
    "type": "string"
  },
  "followupId": {
    "type": "string"
  },
  "kind": {
    "type": "string"
  },
  "name": {
    "type": "string"
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
    }
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
    "type": "string"
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
    "type": "string"
  },
  "fromAt": {
    "type": "number"
  },
  "toAt": {
    "type": "number"
  },
  "approvedBy": {
    "type": "string"
  },
  "checklist": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "text": {
          "type": "string"
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
    }
  },
  "workflow": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string"
      },
      "kind": {
        "type": "string"
      },
      "label": {
        "type": "string"
      },
      "identifier": {
        "type": "string"
      },
      "location": {
        "type": "string"
      },
      "availability": {
        "anyOf": [
          {
            "type": "string"
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
            }
          }
        ]
      },
      "status": {
        "type": "string"
      },
      "viewingOutcome": {
        "type": "string"
      },
      "approvedBy": {
        "type": "string"
      },
      "contactId": {
        "type": "string"
      },
      "conversationId": {
        "type": "string"
      },
      "assignedAccountId": {
        "type": "string"
      },
      "equipmentId": {
        "type": "string"
      },
      "repeatOfId": {
        "type": "string"
      },
      "propertyId": {
        "type": "string"
      },
      "opportunityId": {
        "type": "string"
      },
      "variantId": {
        "type": "string"
      },
      "orderId": {
        "type": "string"
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
        "type": "string"
      },
      "transactionType": {
        "type": "string"
      },
      "propertyType": {
        "type": "string"
      },
      "area": {
        "type": "string"
      },
      "pricePeriod": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "authorityStatus": {
        "type": "string"
      },
      "source": {
        "type": "string"
      },
      "need": {
        "type": "string"
      },
      "financeReadiness": {
        "type": "string"
      },
      "decisionMakerReadiness": {
        "type": "string"
      },
      "timeline": {
        "type": "string"
      },
      "nextAction": {
        "type": "string"
      },
      "lostReason": {
        "type": "string"
      },
      "outcome": {
        "type": "string"
      },
      "terms": {
        "type": "string"
      },
      "text": {
        "type": "string"
      },
      "templateId": {
        "type": "string"
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
          "type": "string"
        }
      },
      "propertyTypes": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "mustHaves": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "features": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "photoIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "identityStatus": {
        "type": "string"
      },
      "financingStatus": {
        "type": "string"
      },
      "agreementStatus": {
        "type": "string"
      },
      "completionStatus": {
        "type": "string"
      },
      "contractType": {
        "type": "string"
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
        "type": "string"
      },
      "milestoneId": {
        "type": "string"
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
        "type": "string"
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
        "type": "string"
      },
      "package": {
        "type": "string"
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
        "type": "string"
      },
      "probability": {
        "type": "number"
      },
      "impact": {
        "type": "number"
      },
      "mitigation": {
        "type": "string"
      },
      "costsComplete": {
        "type": "boolean"
      },
      "checklist": {
        "anyOf": [
          {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "text": {
                  "type": "string"
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
            }
          }
        ]
      },
      "costs": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "label": {
              "type": "string"
            },
            "amountMinor": {
              "type": "number"
            },
            "expenseId": {
              "type": "string"
            }
          },
          "required": [
            "label",
            "amountMinor"
          ],
          "additionalProperties": false
        }
      },
      "milestones": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "label": {
              "type": "string"
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
              "type": "string"
            }
          },
          "required": [
            "label",
            "amountMinor",
            "dueAt",
            "withheld"
          ],
          "additionalProperties": false
        }
      },
      "extras": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "label": {
              "type": "string"
            },
            "amountMinor": {
              "type": "number"
            },
            "approved": {
              "type": "boolean"
            },
            "approvedBy": {
              "type": "string"
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
        }
      },
      "lines": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "kind": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "variantId": {
              "type": "string"
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
        }
      },
      "vehicleId": {
        "type": "string"
      },
      "serviceId": {
        "type": "string"
      },
      "bayId": {
        "type": "string"
      },
      "appointmentId": {
        "type": "string"
      },
      "technicianAccountId": {
        "type": "string"
      },
      "assignedAdvisorAccountId": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "category": {
        "type": "string"
      },
      "plate": {
        "type": "string"
      },
      "vin": {
        "type": "string"
      },
      "make": {
        "type": "string"
      },
      "model": {
        "type": "string"
      },
      "year": {
        "type": "number"
      },
      "powertrain": {
        "type": "string"
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
        "type": "string"
      },
      "warrantyDisposition": {
        "type": "string"
      },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "category": {
              "type": "string"
            },
            "condition": {
              "type": "string"
            },
            "note": {
              "type": "string"
            },
            "photoIds": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "category",
            "condition"
          ],
          "additionalProperties": false
        }
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "jobId": {
    "type": "string"
  },
  "equipmentId": {
    "type": "string"
  },
  "propertyId": {
    "type": "string"
  },
  "enquiryId": {
    "type": "string"
  },
  "productRequestId": {
    "type": "string"
  },
  "opportunityId": {
    "type": "string"
  },
  "matchId": {
    "type": "string"
  },
  "viewingId": {
    "type": "string"
  },
  "offerId": {
    "type": "string"
  },
  "draftId": {
    "type": "string"
  },
  "commissionId": {
    "type": "string"
  },
  "memberId": {
    "type": "string"
  },
  "email": {
    "type": "string"
  },
  "operationalRole": {
    "type": "string"
  },
  "commissionMinor": {
    "type": "number"
  },
  "appointmentRequestId": {
    "type": "string"
  },
  "notificationId": {
    "type": "string"
  },
  "waitlistOfferId": {
    "type": "string"
  },
  "taskId": {
    "type": "string"
  },
  "assignedAccountId": {
    "type": "string"
  },
  "projectId": {
    "type": "string"
  },
  "milestoneId": {
    "type": "string"
  },
  "variationId": {
    "type": "string"
  },
  "commitmentId": {
    "type": "string"
  },
  "claimId": {
    "type": "string"
  },
  "qualityId": {
    "type": "string"
  },
  "riskId": {
    "type": "string"
  },
  "vehicleId": {
    "type": "string"
  },
  "bayId": {
    "type": "string"
  },
  "appointmentId": {
    "type": "string"
  },
  "workOrderId": {
    "type": "string"
  },
  "estimateId": {
    "type": "string"
  },
  "laborEntryId": {
    "type": "string"
  },
  "partAllocationId": {
    "type": "string"
  },
  "source": {
    "type": "string"
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
    "type": "string"
  },
  "evidenceSource": {
    "type": "string"
  },
  "evidenceAt": {
    "type": "number"
  },
  "notificationKind": {
    "type": "string"
  },
  "idempotencyKey": {
    "type": "string"
  },
  "templateId": {
    "type": "string"
  },
  "outsideServiceWindow": {
    "type": "boolean"
  },
  "rating": {
    "type": "number"
  },
  "experienceReason": {
    "type": "string"
  },
  "weekStart": {
    "type": "string"
  },
  "governance": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string"
      },
      "jurisdiction": {
        "type": "string"
      },
      "permitStatus": {
        "type": "string"
      },
      "controller": {
        "type": "string"
      },
      "processor": {
        "type": "string"
      },
      "approvedRegions": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "subprocessors": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "retentionDays": {
        "type": "number"
      },
      "backupRetentionDays": {
        "type": "number"
      },
      "supportAccess": {
        "type": "string"
      },
      "incidentOwner": {
        "type": "string"
      },
      "rightsOwner": {
        "type": "string"
      },
      "crossBorderStatus": {
        "type": "string"
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
    "type": "string"
  },
  "cursor": {
    "type": "string"
  },
  "limit": {
    "type": "number"
  },
  "search": {
    "type": "string"
  },
  "status": {
    "type": "string"
  },
  "itemId": {
    "type": "string"
  },
  "variantId": {
    "type": "string"
  },
  "orderId": {
    "type": "string"
  },
  "contactId": {
    "type": "string"
  },
  "conversationId": {
    "type": "string"
  },
  "item": {
    "type": "object",
    "properties": {
      "kind": {
        "type": "string"
      },
      "nameAr": {
        "type": "string"
      },
      "nameEn": {
        "type": "string"
      },
      "category": {
        "type": "string"
      },
      "unit": {
        "type": "string"
      },
      "trackStock": {
        "type": "boolean"
      },
      "catalogEntryKey": {
        "type": "string"
      },
      "serialized": {
        "type": "boolean"
      },
      "warrantyMonths": {
        "type": "number"
      },
      "warrantyBy": {
        "type": "string"
      },
      "photoId": {
        "type": "string"
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
          "type": "string"
        },
        "sku": {
          "type": "string"
        },
        "options": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "key": {
                "type": "string"
              },
              "value": {
                "type": "string"
              }
            },
            "required": [
              "key",
              "value"
            ],
            "additionalProperties": false
          }
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
    }
  },
  "delta": {
    "type": "number"
  },
  "reason": {
    "type": "string"
  },
  "unitCostMinor": {
    "type": "number"
  },
  "note": {
    "type": "string"
  },
  "channel": {
    "type": "string"
  },
  "lines": {
    "anyOf": [
      {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "variantId": {
              "type": "string"
            },
            "name": {
              "type": "string"
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
                "type": "string"
              }
            },
            "modifierKeys": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "qty"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "variantId": {
              "type": "string"
            },
            "qty": {
              "type": "number"
            },
            "unitCostMinor": {
              "type": "number"
            },
            "useBy": {
              "type": "string"
            }
          },
          "required": [
            "variantId",
            "qty",
            "unitCostMinor"
          ],
          "additionalProperties": false
        }
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
        "type": "string"
      },
      "area": {
        "type": "string"
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
          "type": "string"
        },
        "value": {
          "type": "string"
        }
      },
      "required": [
        "key",
        "value"
      ],
      "additionalProperties": false
    }
  },
  "notes": {
    "type": "string"
  },
  "customerName": {
    "type": "string"
  },
  "to": {
    "type": "string"
  },
  "version": {
    "type": "number"
  },
  "amountMinor": {
    "type": "number"
  },
  "method": {
    "type": "string"
  },
  "reference": {
    "type": "string"
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
        "type": "string"
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
              "type": "string"
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string"
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
        }
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "media": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string"
      },
      "productionType": {
        "type": "string"
      },
      "purpose": {
        "type": "string"
      },
      "budgetMinor": {
        "type": "number"
      },
      "dateNeeded": {
        "type": "string"
      },
      "deliverables": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "format": {
              "type": "string"
            },
            "aspectRatio": {
              "type": "string"
            },
            "durationSeconds": {
              "type": "number"
            },
            "quantity": {
              "type": "number"
            },
            "language": {
              "type": "string"
            }
          },
          "required": [
            "format",
            "quantity"
          ],
          "additionalProperties": false
        }
      },
      "shootStartsAt": {
        "type": "number"
      },
      "shootEndsAt": {
        "type": "number"
      },
      "location": {
        "type": "string"
      },
      "deliveryDueAt": {
        "type": "number"
      },
      "firstCutDueAt": {
        "type": "number"
      },
      "producerId": {
        "type": "string"
      },
      "revisionAllowance": {
        "type": "number"
      },
      "usageRights": {
        "type": "object",
        "properties": {
          "territory": {
            "type": "string"
          },
          "channels": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "termEndsAt": {
            "type": "number"
          },
          "clearance": {
            "type": "string"
          }
        },
        "required": [],
        "additionalProperties": false
      },
      "nextAction": {
        "type": "string"
      },
      "contactId": {
        "type": "string"
      },
      "conversationId": {
        "type": "string"
      },
      "source": {
        "type": "string"
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
        "type": "string"
      },
      "evidenceSource": {
        "type": "string"
      },
      "key": {
        "type": "string"
      },
      "verified": {
        "type": "boolean"
      },
      "note": {
        "type": "string"
      },
      "mediaReceived": {
        "type": "boolean"
      },
      "label": {
        "type": "string"
      },
      "assetRef": {
        "type": "string"
      },
      "approverName": {
        "type": "string"
      },
      "decisionDueAt": {
        "type": "number"
      },
      "decision": {
        "type": "string"
      },
      "feedback": {
        "type": "string"
      },
      "kind": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "priceMinor": {
        "type": "number"
      },
      "deliverable": {
        "type": "object",
        "properties": {
          "format": {
            "type": "string"
          },
          "aspectRatio": {
            "type": "string"
          },
          "durationSeconds": {
            "type": "number"
          },
          "quantity": {
            "type": "number"
          },
          "language": {
            "type": "string"
          }
        },
        "required": [
          "format",
          "quantity"
        ],
        "additionalProperties": false
      },
      "customerApproval": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "category": {
        "type": "string"
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
        "type": "string"
      },
      "changeOrderId": {
        "type": "string"
      },
      "extraScope": {
        "type": "boolean"
      },
      "costKind": {
        "type": "string"
      },
      "incurredAt": {
        "type": "number"
      },
      "link": {
        "type": "string"
      },
      "final": {
        "type": "boolean"
      },
      "text": {
        "type": "string"
      },
      "templateId": {
        "type": "string"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "productionId": {
    "type": "string"
  },
  "cutId": {
    "type": "string"
  },
  "changeOrderId": {
    "type": "string"
  },
  "mediaResourceId": {
    "type": "string"
  },
  "reservationId": {
    "type": "string"
  },
  "costId": {
    "type": "string"
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
              "type": "string"
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string"
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
        }
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "fitness": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string"
      },
      "kind": {
        "type": "string"
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
        "type": "string"
      },
      "classType": {
        "type": "string"
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
        "type": "string"
      },
      "coachName": {
        "type": "string"
      },
      "cancel": {
        "type": "boolean"
      },
      "trial": {
        "type": "boolean"
      },
      "source": {
        "type": "string"
      },
      "sourceEventId": {
        "type": "string"
      },
      "assignedAccountId": {
        "type": "string"
      },
      "days": {
        "type": "number"
      },
      "end": {
        "type": "boolean"
      },
      "text": {
        "type": "string"
      },
      "templateId": {
        "type": "string"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "planId": {
    "type": "string"
  },
  "classId": {
    "type": "string"
  },
  "seatId": {
    "type": "string"
  },
  "dental": {
    "type": "object",
    "properties": {
      "resourceId": {
        "type": "string"
      },
      "kind": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "active": {
        "type": "boolean"
      },
      "providerId": {
        "type": "string"
      },
      "chairId": {
        "type": "string"
      },
      "serviceItemId": {
        "type": "string"
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
        "type": "string"
      },
      "source": {
        "type": "string"
      },
      "replacementForId": {
        "type": "string"
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
        "type": "string"
      },
      "templateId": {
        "type": "string"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "visitId": {
    "type": "string"
  },
  "hvac": {
    "type": "object",
    "properties": {
      "jobType": {
        "type": "string"
      },
      "source": {
        "type": "string"
      },
      "unitIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "area": {
        "type": "string"
      },
      "urgent": {
        "type": "boolean"
      },
      "reportedSymptom": {
        "type": "string"
      },
      "repeatOfId": {
        "type": "string"
      },
      "technicianAccountId": {
        "type": "string"
      },
      "contractId": {
        "type": "string"
      },
      "contractVisitIndex": {
        "type": "number"
      },
      "partsLabel": {
        "type": "string"
      },
      "partsExpectedAt": {
        "type": "number"
      },
      "startsAt": {
        "type": "number"
      },
      "endsAt": {
        "type": "number"
      },
      "outcome": {
        "type": "string"
      },
      "lines": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "kind": {
              "type": "string"
            },
            "name": {
              "type": "string"
            },
            "variantId": {
              "type": "string"
            },
            "qty": {
              "type": "number"
            },
            "unitPriceMinor": {
              "type": "number"
            }
          },
          "required": [
            "kind",
            "name",
            "qty",
            "unitPriceMinor"
          ],
          "additionalProperties": false
        }
      },
      "checklist": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": {
              "type": "string"
            },
            "result": {
              "type": "string"
            }
          },
          "required": [
            "text",
            "result"
          ],
          "additionalProperties": false
        }
      },
      "findings": {
        "type": "string"
      },
      "costs": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "kind": {
              "type": "string"
            },
            "label": {
              "type": "string"
            },
            "amountMinor": {
              "type": "number"
            }
          },
          "required": [
            "kind",
            "label",
            "amountMinor"
          ],
          "additionalProperties": false
        }
      },
      "costsComplete": {
        "type": "boolean"
      },
      "label": {
        "type": "string"
      },
      "unitType": {
        "type": "string"
      },
      "brand": {
        "type": "string"
      },
      "capacityBtu": {
        "type": "number"
      },
      "serial": {
        "type": "string"
      },
      "siteLabel": {
        "type": "string"
      },
      "retired": {
        "type": "boolean"
      },
      "nextServiceAt": {
        "type": "number"
      },
      "clearService": {
        "type": "boolean"
      },
      "visitsPerYear": {
        "type": "number"
      },
      "priceMinor": {
        "type": "number"
      },
      "renewedFromId": {
        "type": "string"
      },
      "text": {
        "type": "string"
      },
      "templateId": {
        "type": "string"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "unitId": {
    "type": "string"
  },
  "contractId": {
    "type": "string"
  },
  "hvacSettings": {
    "type": "object",
    "properties": {
      "arrivalGraceMinutes": {
        "type": "number"
      },
      "repeatWindowDays": {
        "type": "number"
      },
      "estimateWindowDays": {
        "type": "number"
      },
      "bookingWindowDays": {
        "type": "number"
      },
      "renewalHorizonDays": {
        "type": "number"
      },
      "renewalGraceDays": {
        "type": "number"
      },
      "amcVisitLeadDays": {
        "type": "number"
      },
      "autoQuoteLimitMinor": {
        "type": "number"
      },
      "serviceAreas": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "rules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string"
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
        }
      }
    },
    "required": [],
    "additionalProperties": false
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
              "type": "string"
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string"
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
        }
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "retailSettings": {
    "type": "object",
    "properties": {
      "readyUncollectedHours": {
        "type": "number"
      },
      "rules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string"
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
        }
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "retailTechSettings": {
    "type": "object",
    "properties": {
      "readyUncollectedHours": {
        "type": "number"
      },
      "rules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string"
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
        }
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "constructionSettings": {
    "type": "object",
    "properties": {
      "approvalWaitDays": {
        "type": "number"
      },
      "materialsLeadDays": {
        "type": "number"
      },
      "rules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string"
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
        }
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "automotiveSettings": {
    "type": "object",
    "properties": {
      "approvalWaitHours": {
        "type": "number"
      },
      "readyUncollectedHours": {
        "type": "number"
      },
      "autoQuoteLimitMinor": {
        "type": "number"
      },
      "rules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string"
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
        }
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
              "type": "string"
            },
            "enabled": {
              "type": "boolean"
            },
            "mode": {
              "type": "string"
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
        }
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "metric": {
    "type": "string"
  },
  "segment": {
    "type": "string"
  },
  "filter": {
    "type": "string"
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
              "type": "string"
            },
            "unitPriceMinor": {
              "type": "number"
            },
            "qty": {
              "type": "number"
            },
            "name": {
              "type": "string"
            }
          },
          "required": [
            "key"
          ],
          "additionalProperties": false
        }
      },
      "text": {
        "type": "string"
      },
      "depositMinor": {
        "type": "number"
      },
      "validUntil": {
        "type": "number"
      },
      "acceptedBy": {
        "type": "string"
      },
      "evidenceSource": {
        "type": "string"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "stockPolicy": {
    "type": "string"
  },
  "products": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "requestId": {
          "type": "string"
        },
        "item": {
          "type": "object",
          "properties": {
            "kind": {
              "type": "string"
            },
            "nameAr": {
              "type": "string"
            },
            "nameEn": {
              "type": "string"
            },
            "category": {
              "type": "string"
            },
            "unit": {
              "type": "string"
            },
            "trackStock": {
              "type": "boolean"
            },
            "catalogEntryKey": {
              "type": "string"
            },
            "serialized": {
              "type": "boolean"
            },
            "warrantyMonths": {
              "type": "number"
            },
            "warrantyBy": {
              "type": "string"
            },
            "photoId": {
              "type": "string"
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
                "type": "string"
              },
              "options": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "key": {
                      "type": "string"
                    },
                    "value": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "key",
                    "value"
                  ],
                  "additionalProperties": false
                }
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
                  "type": "string"
                }
              }
            },
            "required": [
              "sku",
              "options",
              "priceMinor"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "requestId",
        "item",
        "variants"
      ],
      "additionalProperties": false
    }
  },
  "storageId": {
    "type": "string"
  },
  "photoId": {
    "type": "string"
  },
  "lineSerials": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "variantId": {
          "type": "string"
        },
        "serials": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "variantId",
        "serials"
      ],
      "additionalProperties": false
    }
  },
  "serials": {
    "type": "array",
    "items": {
      "type": "string"
    }
  },
  "serial": {
    "type": "string"
  },
  "costMinor": {
    "type": "number"
  },
  "repairId": {
    "type": "string"
  },
  "device": {
    "type": "string"
  },
  "fault": {
    "type": "string"
  },
  "accessories": {
    "type": "string"
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
          "type": "string"
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
    }
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
          "type": "string"
        },
        "label": {
          "type": "string"
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
                "type": "string"
              },
              "qty": {
                "type": "number"
              },
              "unit": {
                "type": "string"
              }
            },
            "required": [
              "variantId",
              "qty",
              "unit"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "key",
        "label",
        "priceMinor",
        "ingredients"
      ],
      "additionalProperties": false
    }
  },
  "menuVariantId": {
    "type": "string"
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
          "type": "string"
        },
        "qty": {
          "type": "number"
        },
        "unit": {
          "type": "string"
        }
      },
      "required": [
        "variantId",
        "qty",
        "unit"
      ],
      "additionalProperties": false
    }
  },
  "qty": {
    "type": "number"
  },
  "countedQty": {
    "type": "number"
  },
  "invoiceNumber": {
    "type": "string"
  },
  "receivedOn": {
    "type": "string"
  },
  "outputVariantId": {
    "type": "string"
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
          "type": "string"
        },
        "qty": {
          "type": "number"
        },
        "unit": {
          "type": "string"
        }
      },
      "required": [
        "variantId",
        "qty"
      ],
      "additionalProperties": false
    }
  },
  "producedOn": {
    "type": "string"
  },
  "useBy": {
    "type": "string"
  },
  "days": {
    "type": "number"
  },
  "disposition": {
    "type": "string"
  },
  "expenseId": {
    "type": "string"
  },
  "category": {
    "type": "string"
  },
  "vatMinor": {
    "type": "number"
  },
  "vendor": {
    "type": "string"
  },
  "paidOn": {
    "type": "string"
  },
  "period": {
    "type": "string"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
  ],
  "automotive_context": [
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
  ],
  "automotive_draft_approve": [
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
  ],
  "automotive_followups": [
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
  ],
  "automotive_task_resolve": [
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
  ],
  "automotive_task_snooze": [
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "fromAt",
    "toAt"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
  ],
  "construction_context": [
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
  ],
  "construction_draft_approve": [
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
  ],
  "construction_followups": [
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
  ],
  "construction_task_snooze": [
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
    "workflow",
    "draftId",
    "filter",
    "dueAt",
    "contactId",
    "conversationId"
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
  "hvac_approval_record": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_checklist_save": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_context": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_contract": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_contract_renew": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_contract_save": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_contract_status": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_contracts": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_cost_save": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_draft_approve": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_estimate_save": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_estimate_status": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_followups": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_insights": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_job": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_job_save": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_job_status": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_jobs": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_metric_records": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_overview": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_payment_record": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_schedule": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_task_resolve": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_task_snooze": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_unit_save": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_unit_service": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_units": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_visit_save": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
  ],
  "hvac_visit_status": [
    "requestId",
    "version",
    "jobId",
    "visitId",
    "estimateId",
    "unitId",
    "contractId",
    "contactId",
    "conversationId",
    "draftId",
    "taskId",
    "status",
    "reason",
    "approvedBy",
    "evidenceSource",
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
    "search",
    "hvac"
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
    "retailSettings",
    "retailTechSettings",
    "constructionSettings",
    "automotiveSettings",
    "mediaSettings",
    "fitnessSettings",
    "dentalSettings",
    "hvacSettings"
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
  "store_context": [
    "version",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "reason"
  ],
  "store_draft_approve": [
    "version",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "reason"
  ],
  "store_followups": [
    "version",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "reason"
  ],
  "store_overview": [
    "version",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "reason"
  ],
  "store_task_resolve": [
    "version",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "reason"
  ],
  "store_task_snooze": [
    "version",
    "taskId",
    "draftId",
    "contactId",
    "conversationId",
    "filter",
    "dueAt",
    "reason"
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
export const HASIB_REQUIRED_BY_OPERATION = {
  "batch_create": "outputVariantId",
  "contact_summary": "contactId",
  "conversation_orders": "conversationId",
  "expense_void": "expenseId",
  "item_archive": "itemId",
  "item_photo": "itemId",
  "order": "orderId",
  "order_status": "orderId",
  "payment_record": "orderId",
  "recipe_save": "menuVariantId",
  "repair": "repairId",
  "repair_status": "repairId",
  "repair_update": "repairId",
  "serials": "variantId",
  "stock_count": "variantId",
  "stock_move": "variantId",
  "stock_moves": "variantId",
  "trade_in": "variantId",
  "waste_create": "variantId"
};
