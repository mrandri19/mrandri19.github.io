---
layout: post
title: "Data systems papers I have found interesting"
---

-   An Empirical Evaluation of Columnar Storage Formats
    -   Looks at Parquet, ORC
        -   Technically hybrid, due to row groups, not pure columnar. (PAX: Partition Attribute Across)
    -   Due to low number of distinct values in real world datasets (even in floats!), dictionary encoding is good.
    -   Due to high throughput and low cost of object storage compared to compute, compression (of column chunks) is bad.
        -   If the network > compute trend continues, more space heavy indexing techniques will appear.
        -   This does not hold at the moment for GPUs, where PCIe is slow compared to Streaming Multiprocessors.
    -   These formats are good for classic tabular data, less for ML data (i.e. embeddings with thousands of columns).
        -   TODO: look at Meta's Alpha (Shared Foundations: Modernizing Meta’s Data Lakehouse)
        -   https://github.com/facebookincubator/nimble

-   Consistency Tradeoffs in Modern Distributed Database System Design
    -   CAP (Consistency vs Availability vs Partition tolerance) is not really applicable to normal operation.
    -   PACELC (pronounced pass-elk):
        if there is a Partition, how does the system trade off Consistency and Availability?
        Else, in the absence of partitions, how does the system trade off Latency and Consistency?
    -   With CAP we have
        -   CA
        -    AP
        -   C P
    -   With PACELC we have
        -   PA/EL: during a partition be available, during normal operation be available and prefer latency over consistency
            -   E.g. Cassandra, Dynamo, Riak
        -   PC/EL: during a partition be consistent, during normal operation be available and prefer latency over consistency
            -   E.g. PNUTS. This basically means, have a baseline (not complete) level of consistency during normal operation, and never go below that
        -   PA/EC: during a partition be available, during normal operation be consistent and sacrifice latency
            -   E.g. MongoDB. During partitions, allow split brain situations, otherwide be consistent. Typical of leader/follower systems.
        -   PC/EC: during a partition be consistent, during normal operations be consistent and sacrifice latency
            -   E.g. Distributed ACID databases
