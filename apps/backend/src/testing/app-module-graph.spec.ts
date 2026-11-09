import { ApplicationConfig } from '@nestjs/core/application-config';
import { DependenciesScanner } from '@nestjs/core/scanner';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector';
import { NestContainer } from '@nestjs/core/injector/container';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { type DynamicModule } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { AppModule } from '../app.module';
import { User } from '../modules/auth/user.entity';
import { Buoy } from '../modules/spacecraft/entities/buoy.entity';
import { Spacecraft } from '../modules/spacecraft/entities/spacecraft.entity';
import { SpaceLocation } from '../modules/starmap/entities/space-location.entity';

class MetadataDataSource extends DataSource {
  async buildEntityMetadata(): Promise<void> {
    await this.buildMetadatas();
  }
}

describe('AppModule imports', () => {
  it('scans the complete Nest module graph without undefined imports', async () => {
    const container = new NestContainer();
    const scanner = new DependenciesScanner(
      container,
      new MetadataScanner(),
      new GraphInspector(container),
      new ApplicationConfig(),
    );

    await expect(scanner.scan(AppModule)).resolves.toBeUndefined();
  });

  it('builds usable Buoy repository metadata from the application datasource options without connecting', async () => {
    const imports: DynamicModule[] = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);
    const databaseModule = imports.find((item) => item.module === TypeOrmModule);
    const coreModule = databaseModule?.imports?.[0] as DynamicModule | undefined;
    const optionsProvider = coreModule?.providers?.find(
      (provider) =>
        typeof provider === 'object' &&
        'provide' in provider &&
        provider.provide === 'TypeOrmModuleOptions',
    );
    expect(optionsProvider).toBeDefined();
    if (!optionsProvider) throw new Error('Application datasource options provider missing');

    const module = await Test.createTestingModule({
      providers: [
        optionsProvider,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => key === 'NODE_ENV' ? 'production' : undefined },
        },
      ],
    }).compile();

    try {
      const options = module.get<DataSourceOptions>('TypeOrmModuleOptions');
      expect(options.synchronize).toBe(false);
      const source = new MetadataDataSource(options);
      await source.buildEntityMetadata();
      const metadata = source.getRepository(Buoy).metadata;
      expect(metadata.tableName).toBe('spacecraft_buoys');
      expect(metadata.target).toBe(Buoy);
      for (const [property, target] of [
        ['user', User],
        ['spacecraft', Spacecraft],
        ['location', SpaceLocation],
      ] as const) {
        expect(metadata.findRelationWithPropertyPath(property)?.inverseEntityMetadata.target).toBe(target);
      }
      expect(source.isInitialized).toBe(false);
    } finally {
      await module.close();
    }
  });
});
