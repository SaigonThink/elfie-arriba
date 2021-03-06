﻿using Arriba.Client;
using Arriba.Model.Column;
using Arriba.Structures;
using Arriba.Types;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using Arriba.Model.Security;

namespace Arriba.TfsWorkItemCrawler.ItemConsumers
{
    /// <summary>
    ///  An IItemConsumer which indexes items into an Arriba table using the
    ///  Arriba client API. This consumer should be used when hosting Arriba with
    ///  the service running, so that the one live copy hosting searches is used
    ///  to index changes also.
    /// </summary>
    public class ArribaClientIndexerItemConsumer : IItemConsumer
    {
        private string ServiceUrl { get; set; }
        private CrawlerConfiguration Configuration { get; set; }

        private ArribaClient Client { get; set; }
        private ArribaTableClient Table { get; set; }

        private Stopwatch SinceLastWrite { get; set; }

        public ArribaClientIndexerItemConsumer(CrawlerConfiguration config, string serviceUrl)
        {
            this.Configuration = config;
            this.ServiceUrl = serviceUrl;

            // Allow long timeouts (save for huge databases is slow)
            this.Client = new ArribaClient(new Uri(this.ServiceUrl), TimeSpan.FromMinutes(15));
            this.Table = this.Client[this.Configuration.ArribaTable];
        }

        public void CreateTable(IList<ColumnDetails> columns, SecurityPermissions permissions)
        {
            HashSet<string> tables = new HashSet<string>(this.Client.Tables);
            if (!tables.Contains(this.Configuration.ArribaTable))
            {
                // Create the table if it doesn't yet exist
                CreateTableRequest ctr = new CreateTableRequest();
                ctr.TableName = this.Configuration.ArribaTable;
                ctr.ItemCountLimit = this.Configuration.ItemCountLimit;
                ctr.Permissions = this.Configuration.LoadPermissions();

                this.Client.CreateTableAsync(ctr).Wait();
            }
            else
            {
                // Always ensure permissions up-to-date on Table
                this.Table.SetPermissionsAsync(permissions).Wait();
            }

            // Verify all columns match requested types [will throw if column exists but as different type]
            this.Table.AddColumnsAsync(columns).Wait();
        }

        public void Append(DataBlock items)
        {
            this.Table.ImportDataBlock(items).Wait();
        }

        public void Save()
        {
            this.Table.SaveAsync().Wait();
        }

        public void Dispose()
        {
            if (this.Table != null)
            {
                this.Table = null;
            }

            if (this.Client != null)
            {
                this.Client.Dispose();
                this.Client = null;
            }
        }
    }
}
