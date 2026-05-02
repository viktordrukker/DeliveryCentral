import { Injectable } from '@nestjs/common';

import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';

export type SnippetTarget = 'otlp' | 'splunk' | 'datadog' | 'syslog' | 'fluentbit';

interface Snippet {
  target: SnippetTarget;
  filename: string;
  contentType: string;
  body: string;
}

/**
 * Returns a copy-pasteable shipper config snippet for the operator's external
 * log/trace pipeline. Reads the endpoints + tokens collected by the wizard's
 * `monitoring` step from platform_settings; falls back to placeholders when
 * a forwarder is disabled or unconfigured (operator can still grab the
 * snippet shape and edit it).
 *
 * The wizard's frontend exposes a "Download config snippet" button per
 * forwarder; the resulting file is meant to be dropped into the operator's
 * collector/fluentbit/splunk-otel/etc config.
 */
@Injectable()
export class MonitoringSnippetService {
  public constructor(private readonly platformSettings: PlatformSettingsService) {}

  public async build(target: SnippetTarget): Promise<Snippet> {
    switch (target) {
      case 'otlp':
        return this.otlpSnippet();
      case 'splunk':
        return this.splunkSnippet();
      case 'datadog':
        return this.datadogSnippet();
      case 'syslog':
        return this.syslogSnippet();
      case 'fluentbit':
        return this.fluentBitSnippet();
    }
  }

  private async readSetting(key: string, fallback: string): Promise<string> {
    const v = await this.platformSettings.getRawValue(key);
    if (v === null || v === undefined || v === '') return fallback;
    return String(v);
  }

  private async otlpSnippet(): Promise<Snippet> {
    const endpoint = await this.readSetting('monitoring.otlp.endpoint', 'https://collector.example.com:4318');
    const headers = await this.readSetting('monitoring.otlp.headers', 'Authorization=Bearer YOUR_TOKEN');
    const body = `# OpenTelemetry Collector — minimal OTLP HTTP receiver + processor + exporter
# Drop into config.yaml of an OpenTelemetry Collector deployment.

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s

exporters:
  otlphttp:
    endpoint: ${endpoint}
    headers:
      ${headers
        .split(',')
        .map((kv) => kv.trim())
        .filter(Boolean)
        .map((kv) => {
          const [k, ...rest] = kv.split('=');
          return `${k}: "${rest.join('=')}"`;
        })
        .join('\n      ')}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
`;
    return { target: 'otlp', filename: 'otel-collector.yaml', contentType: 'application/yaml', body };
  }

  private async splunkSnippet(): Promise<Snippet> {
    const hec = await this.readSetting('monitoring.splunk.hecUrl', 'https://splunk.example.com:8088/services/collector');
    const token = await this.readSetting('monitoring.splunk.token', 'YOUR_HEC_TOKEN');
    const body = `# Splunk HEC forwarder snippet — Fluent Bit / fluentd target.
# Sends DeliveryCentral container stdout to the configured HEC endpoint.

[OUTPUT]
    Name           splunk
    Match          *
    Host           ${new URL(hec).hostname}
    Port           ${new URL(hec).port || '8088'}
    TLS            On
    TLS.verify     Off
    Splunk_Token   ${token}
    Splunk_Send_Raw    Off
    event_index    main
    event_source   deliverycentral
`;
    return { target: 'splunk', filename: 'splunk-hec.fluentbit.conf', contentType: 'text/plain', body };
  }

  private async datadogSnippet(): Promise<Snippet> {
    const apiKey = await this.readSetting('monitoring.datadog.apiKey', 'YOUR_DD_API_KEY');
    const region = await this.readSetting('monitoring.datadog.region', 'US1');
    const body = `# Datadog Agent — Docker label-based autodiscovery.
# Drop into datadog.yaml or pass DD_API_KEY + DD_SITE to the agent container.

api_key: ${apiKey}
site: ${region.toLowerCase()}.datadoghq.com
logs_enabled: true
listeners:
  - name: docker
config_providers:
  - name: docker
    polling: true
logs_config:
  container_collect_all: true
`;
    return { target: 'datadog', filename: 'datadog.yaml', contentType: 'application/yaml', body };
  }

  private async syslogSnippet(): Promise<Snippet> {
    const host = await this.readSetting('monitoring.syslog.host', 'syslog.example.com');
    const port = await this.readSetting('monitoring.syslog.port', '514');
    const body = `# rsyslog forwarder snippet — drop into /etc/rsyslog.d/50-deliverycentral.conf

# Forward all docker container logs to remote syslog
*.* action(type="omfwd"
  Target="${host}"
  Port="${port}"
  Protocol="tcp"
  Template="RSYSLOG_SyslogProtocol23Format"
)
`;
    return { target: 'syslog', filename: '50-deliverycentral.conf', contentType: 'text/plain', body };
  }

  private async fluentBitSnippet(): Promise<Snippet> {
    const body = `# Fluent Bit baseline — collect every container's stdout, parse JSON, route to the operator's chosen output.
# This snippet captures DeliveryCentral's structured pino logs out of the box.

[SERVICE]
    Flush         5
    Daemon        Off
    Log_Level     info

[INPUT]
    Name              tail
    Path              /var/lib/docker/containers/*/*.log
    Parser            docker
    Tag               docker.*
    Refresh_Interval  5

[FILTER]
    Name           parser
    Match          docker.*
    Key_Name       log
    Parser         json

[OUTPUT]
    Name   stdout
    Match  *
`;
    return { target: 'fluentbit', filename: 'fluent-bit.conf', contentType: 'text/plain', body };
  }
}
