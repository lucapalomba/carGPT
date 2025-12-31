CREATE DATABASE IF NOT EXISTS openlit;

USE openlit;

-- Traces table
CREATE TABLE IF NOT EXISTS otel_traces (
    Timestamp DateTime64(9),
    TraceId String,
    SpanId String,
    ParentSpanId String,
    TraceState String,
    SpanName String,
    SpanKind String,
    ServiceName String,
    ResourceAttributes Map(String, String),
    SpanAttributes Map(String, String),
    Duration Int64,
    StatusCode String,
    StatusMessage String
) ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, SpanName, Timestamp);

-- Logs table
CREATE TABLE IF NOT EXISTS otel_logs (
    Timestamp DateTime64(9),
    TraceId String,
    SpanId String,
    TraceFlags UInt32,
    SeverityText String,
    SeverityNumber Int32,
    ServiceName String,
    Body String,
    ResourceAttributes Map(String, String),
    LogAttributes Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, SeverityText, Timestamp);

-- Metrics table 
CREATE TABLE IF NOT EXISTS otel_metrics (
    Timestamp DateTime64(9),
    MetricName String,
    MetricDescription String,
    MetricUnit String,
    ServiceName String,
    ResourceAttributes Map(String, String),
    AttributesMap Map(String, String),
    Value Float64
) ENGINE = MergeTree()
PARTITION BY toDate(Timestamp)
ORDER BY (MetricName, ServiceName, Timestamp);
