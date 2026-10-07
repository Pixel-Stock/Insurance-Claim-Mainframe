      ******************************************************************
      * RULE TABLE - 32 VALIDATION RULES                              *
      * GENERATED FROM rules.csv                                      *
      ******************************************************************
       01  RULE-TABLE.
           05  RULE-COUNT              PIC 9(2) VALUE 32.
           05  RULE-ENTRY OCCURS 32 TIMES
                          ASCENDING KEY RULE-ID
                          INDEXED BY RULE-IDX.
               10  RULE-ID             PIC X(4).
               10  RULE-CLASS          PIC X.
                   88  RULE-HARD       VALUE 'H'.
                   88  RULE-CRITICAL   VALUE 'C'.
                   88  RULE-MANUAL     VALUE 'M'.
                   88  RULE-WARNING    VALUE 'W'.
               10  RULE-WEIGHT         PIC 9(3).
               10  RULE-CARC           PIC X(3).
               10  RULE-DESC           PIC X(60).
      *
       01  RULE-STATIC-DATA.
      * R001-R007: RECORD INTEGRITY
           05  FILLER PIC X(71) VALUE
               'R001H10016 Mandatory field is blank                 '.
           05  FILLER PIC X(71) VALUE
               'R002H10016 Invalid date format                      '.
           05  FILLER PIC X(71) VALUE
               'R003H10016 Invalid diagnosis code format            '.
           05  FILLER PIC X(71) VALUE
               'R004H100181Invalid procedure code format            '.
           05  FILLER PIC X(71) VALUE
               'R005H10016 Invalid provider NPI                     '.
           05  FILLER PIC X(71) VALUE
               'R006H10016 Invalid amount or units                  '.
           05  FILLER PIC X(71) VALUE
               'R007H10016 Date logic error                         '.
      * R010-R016, R020: ELIGIBILITY AND TIMELINESS
           05  FILLER PIC X(71) VALUE
               'R010H10031 Policy not found                         '.
           05  FILLER PIC X(71) VALUE
               'R011H10031 Member not found                         '.
           05  FILLER PIC X(71) VALUE
               'R012H10027 Policy inactive                          '.
           05  FILLER PIC X(71) VALUE
               'R013H10026 Service before effective date            '.
           05  FILLER PIC X(71) VALUE
               'R014H10027 Service after termination                '.
           05  FILLER PIC X(71) VALUE
               'R015M04096 Within waiting period                    '.
           05  FILLER PIC X(71) VALUE
               'R016H10016 Provider not found or inactive           '.
           05  FILLER PIC X(71) VALUE
               'R020H10029 Filing limit exceeded                    '.
      * R030-R035: BENEFIT AND PRICING
           05  FILLER PIC X(71) VALUE
               'R030C060119Exceeds remaining sum insured            '.
           05  FILLER PIC X(71) VALUE
               'R031H10096 Procedure excluded under plan            '.
           05  FILLER PIC X(71) VALUE
               'R032M045197Pre-authorization missing                '.
           05  FILLER PIC X(71) VALUE
               'R033M02545 Billed above fee schedule                '.
           05  FILLER PIC X(71) VALUE
               'R034M020-  High-value claim                         '.
           05  FILLER PIC X(71) VALUE
               'R035M03016 Code not in reference table              '.
      * R040-R045: CLINICAL CONSISTENCY
           05  FILLER PIC X(71) VALUE
               'R040M03511 Diagnosis procedure mismatch             '.
           05  FILLER PIC X(71) VALUE
               'R041M0306  Age restriction                          '.
           05  FILLER PIC X(71) VALUE
               'R042M0407  Gender restriction                       '.
           05  FILLER PIC X(71) VALUE
               'R043M0305  Place of service invalid                 '.
           05  FILLER PIC X(71) VALUE
               'R044M030151Units exceed maximum                     '.
           05  FILLER PIC X(71) VALUE
               'R045M035236Non-billable pair                        '.
      * R050-R054: DUPLICATES AND ANOMALIES
           05  FILLER PIC X(71) VALUE
               'R050H10018 Exact duplicate                          '.
           05  FILLER PIC X(71) VALUE
               'R051C05518 Probable duplicate                       '.
           05  FILLER PIC X(71) VALUE
               'R052M025-  High frequency                           '.
           05  FILLER PIC X(71) VALUE
               'R053C070-  Provider watch-list or sanctioned        '.
           05  FILLER PIC X(71) VALUE
               'R054W010-  Round amount pattern                     '.
      *
       01  RULE-TABLE-REDEF REDEFINES RULE-STATIC-DATA.
           05  RULE-LOAD OCCURS 32 TIMES.
               10  RULE-LOAD-ID        PIC X(4).
               10  RULE-LOAD-CLASS     PIC X.
               10  RULE-LOAD-WEIGHT    PIC 9(3).
               10  RULE-LOAD-CARC      PIC X(3).
               10  RULE-LOAD-DESC      PIC X(60).
