<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0"
  xmlns:S3="http://s3.amazonaws.com/doc/2006-03-01/"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
	<table cellspacing="0">
		<thead>
			<tr>
			  <th align="left">Key</th>
			  <th align="left">Last Modified</th>
			  <th align="left">Size</th>
			</tr>
		</thead>
		<tbody>
			<xsl:for-each select="S3:ListBucketResult/S3:CommonPrefixes">
				<tr>
					<td><a><xsl:attribute name="href">/<xsl:value-of select="S3:Prefix"/></xsl:attribute><xsl:value-of select="S3:Prefix"/></a></td>
				</tr>
			</xsl:for-each>
			<xsl:for-each select="S3:ListBucketResult/S3:Contents">
				<tr>
				  <td><a><xsl:attribute name="href">/<xsl:value-of select="S3:Key"/></xsl:attribute><xsl:value-of select="S3:Key"/></a></td>
				  <td><xsl:value-of select="S3:LastModified"/></td>
				  <td><xsl:value-of select="S3:Size"/></td>
				</tr>
			</xsl:for-each>
		</tbody>
	</table>
</xsl:template>

</xsl:stylesheet>

